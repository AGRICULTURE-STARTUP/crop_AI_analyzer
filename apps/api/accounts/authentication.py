"""JWT authentication with a server-enforced inactivity timeout."""

from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from accounts.session_activity import (
    is_session_active,
    mark_session_active,
    session_id_for_token,
)


class IdleTimeoutJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None

        user, token = result
        session_id = session_id_for_token(token)
        if not is_session_active(session_id, token.get("iat")):
            raise AuthenticationFailed(
                "Session expired after 30 minutes of inactivity.",
                code="session_expired",
            )
        mark_session_active(session_id)
        return user, token
