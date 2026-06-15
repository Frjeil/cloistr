from dataclasses import dataclass


@dataclass(frozen=True)
class BadgeDefinition:
    slug: str
    name: str
    description: str
    icon: str


BADGE_DEFINITIONS: dict[str, BadgeDefinition] = {
    "first_checkin": BadgeDefinition(
        slug="first_checkin",
        name="First Steps",
        description="Complete your first check-in",
        icon="🚪",
    ),
    "regular": BadgeDefinition(
        slug="regular",
        name="Regular",
        description="Complete 10 check-ins",
        icon="📅",
    ),
    "dedicated": BadgeDefinition(
        slug="dedicated",
        name="Dedicated",
        description="Complete 50 check-ins",
        icon="📚",
    ),
    "veteran": BadgeDefinition(
        slug="veteran",
        name="Veteran",
        description="Complete 100 check-ins",
        icon="🏆",
    ),
    "early_bird": BadgeDefinition(
        slug="early_bird",
        name="Early Bird",
        description="Check-in before 8:00 AM",
        icon="🌅",
    ),
    "night_owl": BadgeDefinition(
        slug="night_owl",
        name="Night Owl",
        description="Check-in after 10:00 PM",
        icon="🦉",
    ),
    "power_user": BadgeDefinition(
        slug="power_user",
        name="Power User",
        description="Use power outlets in 10 check-ins",
        icon="🔌",
    ),
    "streak_7": BadgeDefinition(
        slug="streak_7",
        name="Week Warrior",
        description="Maintain a 7-day streak",
        icon="🔥",
    ),
    "streak_30": BadgeDefinition(
        slug="streak_30",
        name="Month Master",
        description="Maintain a 30-day streak",
        icon="💎",
    ),
    "explorer": BadgeDefinition(
        slug="explorer",
        name="Explorer",
        description="Visit 5 different spaces",
        icon="🗺️",
    ),
    "social_butterfly": BadgeDefinition(
        slug="social_butterfly",
        name="Social Butterfly",
        description="Check into spaces with other users present",
        icon="🦋",
    ),
}


def compute_badges(
    total_checkins: int,
    activity_streak_days: int,
    power_checkins: int,
    distinct_spaces: int,
    has_early_bird: bool,
    has_night_owl: bool,
    has_social_checkins: bool,
) -> list[str]:
    earned = []
    if total_checkins >= 1:
        earned.append("first_checkin")
    if total_checkins >= 10:
        earned.append("regular")
    if total_checkins >= 50:
        earned.append("dedicated")
    if total_checkins >= 100:
        earned.append("veteran")
    if has_early_bird:
        earned.append("early_bird")
    if has_night_owl:
        earned.append("night_owl")
    if power_checkins >= 10:
        earned.append("power_user")
    if activity_streak_days >= 7:
        earned.append("streak_7")
    if activity_streak_days >= 30:
        earned.append("streak_30")
    if distinct_spaces >= 5:
        earned.append("explorer")
    if has_social_checkins:
        earned.append("social_butterfly")
    return earned
