import uuid


def uid() -> str:
    return str(uuid.uuid4())


def question(type_, title="Q", required=False, choices=(), logic=(), **props):
    return {
        "id": uid(),
        "type": type_,
        "title": title,
        "required": required,
        "properties": props,
        "choices": [{"id": uid(), "label": label} for label in choices],
        "logic": list(logic),
    }


def make_form(client, questions, publish=True):
    form = client.post("/api/forms", json={"title": "Test"}).json()
    body = {"title": "Test", "settings": {}, "questions": questions}
    saved = client.put(f"/api/forms/{form['id']}", json=body)
    assert saved.status_code == 200, saved.text
    if publish:
        client.post(f"/api/forms/{form['id']}/publish")
    return saved.json()


def start(client, slug):
    res = client.post(f"/api/public/forms/{slug}/responses")
    assert res.status_code == 201
    return res.json()["id"]


def test_form_crud_and_listing(client):
    form = make_form(client, [question("short_text")], publish=False)
    assert form["status"] == "draft"

    client.patch(f"/api/forms/{form['id']}", json={"title": "Renamed"})
    copy = client.post(f"/api/forms/{form['id']}/duplicate").json()
    assert copy["title"] == "Copy of Renamed"
    assert copy["questions"][0]["id"] != form["questions"][0]["id"]

    listed = client.get("/api/forms").json()
    assert {f["title"] for f in listed} == {"Renamed", "Copy of Renamed"}
    assert all(f["question_count"] == 1 for f in listed)

    assert client.delete(f"/api/forms/{copy['id']}").status_code == 204
    assert client.get(f"/api/forms/{copy['id']}").status_code == 404


def test_reorder_keeps_ids_and_choices(client):
    q1 = question("multiple_choice", choices=["A", "B"])
    q2 = question("short_text")
    form = make_form(client, [q1, q2], publish=False)

    q1["choices"][0]["label"] = "A (edited)"
    body = {"title": "Test", "settings": {}, "questions": [q2, q1]}
    saved = client.put(f"/api/forms/{form['id']}", json=body).json()
    assert [q["id"] for q in saved["questions"]] == [q2["id"], q1["id"]]
    assert saved["questions"][1]["choices"][0] == {"id": q1["choices"][0]["id"], "label": "A (edited)"}


def test_draft_is_not_public(client):
    form = make_form(client, [question("short_text")], publish=False)
    assert client.get(f"/api/public/forms/{form['slug']}").status_code == 404
    client.post(f"/api/forms/{form['id']}/publish")
    assert client.get(f"/api/public/forms/{form['slug']}").status_code == 200


def test_submit_validates_answers(client):
    email = question("email", required=True)
    number = question("number", min_value=1, max_value=10)
    choice = question("multiple_choice", choices=["Red", "Blue"])
    form = make_form(client, [email, number, choice])
    rid = start(client, form["slug"])

    bad = client.post(
        f"/api/public/forms/{form['slug']}/responses/{rid}/submit",
        json={"answers": {email["id"]: "nope", number["id"]: 42, choice["id"]: ["not-a-choice"]}},
    )
    assert bad.status_code == 422
    errors = {e["question_id"] for e in bad.json()["errors"]}
    assert errors == {email["id"], number["id"], choice["id"]}

    ok = client.post(
        f"/api/public/forms/{form['slug']}/responses/{rid}/submit",
        json={"answers": {email["id"]: "a@b.co", number["id"]: "7", choice["id"]: [choice["choices"][1]["id"]]}},
    )
    assert ok.status_code == 200, ok.text

    again = client.post(f"/api/public/forms/{form['slug']}/responses/{rid}/submit", json={"answers": {}})
    assert again.status_code == 409

    stored = client.get(f"/api/forms/{form['id']}/responses").json()
    assert stored["total"] == 1
    displays = {a["question_id"]: a["display"] for a in stored["items"][0]["answers"]}
    assert displays == {email["id"]: "a@b.co", number["id"]: "7", choice["id"]: "Blue"}


def test_required_question_skipped_by_logic(client):
    skip_to_end = question("yes_no", required=True)
    follow_up = question("short_text", required=True)
    skip_to_end["logic"] = [{"operator": "is", "value": "false", "destination_id": None}]
    form = make_form(client, [skip_to_end, follow_up])
    rid = start(client, form["slug"])

    # "No" ends the form, so the required follow-up is not needed.
    res = client.post(
        f"/api/public/forms/{form['slug']}/responses/{rid}/submit",
        json={"answers": {skip_to_end["id"]: False, follow_up["id"]: "stale answer"}},
    )
    assert res.status_code == 200, res.text
    answers = client.get(f"/api/forms/{form['id']}/responses").json()["items"][0]["answers"]
    assert [a["question_id"] for a in answers] == [skip_to_end["id"]]

    # "Yes" continues, so the follow-up is required.
    rid = start(client, form["slug"])
    res = client.post(
        f"/api/public/forms/{form['slug']}/responses/{rid}/submit",
        json={"answers": {skip_to_end["id"]: True}},
    )
    assert res.status_code == 422


def test_partial_responses_and_summary(client):
    rating = question("rating", required=True, steps=5)
    yes_no = question("yes_no")
    form = make_form(client, [rating, yes_no])
    slug = form["slug"]

    for value in (5, 4):
        rid = start(client, slug)
        res = client.post(f"/api/public/forms/{slug}/responses/{rid}/submit",
                          json={"answers": {rating["id"]: value, yes_no["id"]: value == 5}})
        assert res.status_code == 200
    partial = start(client, slug)
    assert client.patch(f"/api/public/forms/{slug}/responses/{partial}",
                        json={"answers": {rating["id"]: 3}}).status_code == 204
    assert client.patch(f"/api/public/forms/{slug}/responses/{partial}",
                        json={"answers": {rating["id"]: 9}}).status_code == 422

    summary = client.get(f"/api/forms/{form['id']}/summary").json()
    assert summary["insights"]["starts"] == 3
    assert summary["insights"]["submissions"] == 2
    assert summary["insights"]["completion_rate"] == 66.7
    rating_stats = summary["questions"][0]
    assert rating_stats["average"] == 4.5
    assert [c["count"] for c in rating_stats["choices"]] == [0, 0, 0, 1, 1]

    partials = client.get(f"/api/forms/{form['id']}/responses?completed=false").json()
    assert partials["total"] == 1

    csv = client.get(f"/api/forms/{form['id']}/export.csv")
    assert csv.status_code == 200
    assert csv.text.count("\n") == 3  # header + 2 completed responses


def test_ids_cannot_be_stolen_from_other_forms(client):
    shared = question("short_text")
    make_form(client, [shared], publish=False)
    other = client.post("/api/forms", json={"title": "Other"}).json()
    res = client.put(f"/api/forms/{other['id']}", json={"title": "Other", "settings": {}, "questions": [shared]})
    assert res.status_code == 409
