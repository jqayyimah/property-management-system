from app.request_validator import validate_payload


def run():
    payload = {"name": "Alice", "age": 25}
    required_fields = ["name", "age", "email"]
    try:
        validate_payload(payload, required_fields)
        print("Payload is valid.")
    except ValueError as exc:
        print(f"Validation error: {exc}")


if __name__ == "__main__":
    run()
