from rest_framework.permissions import BasePermission, SAFE_METHODS


def _role_for_user(user) -> str | None:
    if not (user and user.is_authenticated):
        return None
    if user.is_staff:
        return "admin"
    if hasattr(user, "lending_partner_profile"):
        return "lender"
    if hasattr(user, "agency_profile"):
        return "agency"
    if hasattr(user, "farmer_profile"):
        return "farmer"
    return "user"


class IsStaffUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsFarmer(BasePermission):
    message = "Only farmer accounts can perform this action."

    def has_permission(self, request, view):
        return _role_for_user(request.user) == "farmer"


class IsAgency(BasePermission):
    """Require an authenticated user with an AgencyProfile."""

    message = "Only registered input agencies can manage products."

    def has_permission(self, request, view):
        return _role_for_user(request.user) == "agency"


class IsLendingPartner(BasePermission):
    def has_permission(self, request, view):
        return _role_for_user(request.user) == "lender"


class IsApprovedLendingPartner(BasePermission):
    """Require an approved lending partner profile."""

    message = "Lending partner must be approved to perform this action."

    def has_permission(self, request, view):
        if _role_for_user(request.user) != "lender":
            return False
        profile = getattr(request.user, "lending_partner_profile", None)
        if profile is None:
            return False
        if request.method in SAFE_METHODS and getattr(view, "allow_pending_read", False):
            return True
        return profile.verification_status == "approved"
