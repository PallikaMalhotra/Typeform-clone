"""Domain errors raised by services and turned into HTTP responses in main.py.

Keeping HTTP out of the services makes them easy to test and reuse.
"""


class DomainError(Exception):
    status_code = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    status_code = 404


class ConflictError(DomainError):
    status_code = 409


class AnswerValidationError(DomainError):
    """One or more answers are invalid. `errors` maps question id -> message."""

    status_code = 422

    def __init__(self, errors: dict[str, str]):
        super().__init__("Some answers are invalid")
        self.errors = errors
