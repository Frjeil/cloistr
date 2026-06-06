from app.core.levels import compute_level
from app.models import ProfileDocument
from app.schemas.profile import ProfileDetails


def document_to_profile_details(document: ProfileDocument) -> ProfileDetails:
    return ProfileDetails(
        id=document.account_key,
        username=document.username,
        email=document.email,
        xp=document.xp,
        total_checkins=document.total_checkins,
        activity_streak_days=document.activity_streak_days,
        last_checkin_date=document.last_checkin_date,
        avatar_url=document.avatar_url,
        share_presence=document.share_presence,
        discord_handle=document.discord_handle,
        level=compute_level(document.xp),
        earned_badges=document.earned_badges,
    )
