
from fastapi import Depends, HTTPException, status

from app.api.dependencies import get_current_user
from app.models.user import User


def require_roles(*allowed_roles: str):

    def role_checker(
        current_user: User = Depends(get_current_user)
    ):
        user_role = current_user.role.name

        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource."
            )

        return current_user

    return role_checker
