from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsStaffUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsLendingPartner(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return hasattr(request.user, "lending_partner_profile")


class IsApprovedLendingPartner(BasePermission):
    """Require an approved lending partner profile."""

    message = "Lending partner must be approved to perform this action."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, "lending_partner_profile", None)
        if profile is None:
            return False
        if request.method in SAFE_METHODS and getattr(view, "allow_pending_read", False):
            return True
        return profile.verification_status == "approved"
