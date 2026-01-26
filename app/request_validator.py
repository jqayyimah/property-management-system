def validate_payload(payload, required_fields):
    missing_fields = [
        field for field in required_fields if field not in payload
    ]

    if missing_fields:
        raise ValueError(
            f"Missing required fields: {', '.join(missing_fields)}"
        )

    return True
