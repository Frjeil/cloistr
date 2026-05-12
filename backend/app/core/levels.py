from app.schemas.profile import ProfileLevel, ProfileLevelRef

LEVEL_THRESHOLDS: list[tuple[int, str, str]] = [
    (0, "novice", "Novice"),
    (100, "student", "Student"),
    (300, "scholar", "Scholar"),
    (600, "scribe", "Scribe"),
    (1000, "archivist", "Archivist"),
    (1500, "loremaster", "Loremaster"),
    (2500, "sage", "Sage"),
    (4000, "luminary", "Luminary"),
    (6000, "oracle", "Oracle"),
    (8500, "transcendent", "Transcendent"),
    (12000, "mythic", "Mythic"),
]


def compute_level(xp: int) -> ProfileLevel | None:
    if not LEVEL_THRESHOLDS:
        return None

    total = len(LEVEL_THRESHOLDS)
    current_idx = 0
    for i in range(total - 1, -1, -1):
        if xp >= LEVEL_THRESHOLDS[i][0]:
            current_idx = i
            break

    xp_threshold, slug, name = LEVEL_THRESHOLDS[current_idx]
    is_max = current_idx == total - 1

    if is_max:
        return ProfileLevel(
            slug=slug,
            name=name,
            xp_into_level=xp - xp_threshold,
            xp_required_for_next_level=0,
            xp_to_next_level=0,
            progress_percentage=100,
            position=current_idx + 1,
            total_levels=total,
            is_max_level=True,
            next_level=None,
        )

    next_threshold = LEVEL_THRESHOLDS[current_idx + 1][0]
    xp_into = xp - xp_threshold
    xp_required = next_threshold - xp_threshold
    xp_to_next = xp_required - xp_into
    progress = max(0, int((xp_into / xp_required) * 100)) if xp_required > 0 else 0

    next_slug = LEVEL_THRESHOLDS[current_idx + 1][1]
    next_name = LEVEL_THRESHOLDS[current_idx + 1][2]

    return ProfileLevel(
        slug=slug,
        name=name,
        xp_into_level=xp_into,
        xp_required_for_next_level=xp_required,
        xp_to_next_level=xp_to_next,
        progress_percentage=progress,
        position=current_idx + 1,
        total_levels=total,
        is_max_level=False,
        next_level=ProfileLevelRef(slug=next_slug, name=next_name),
    )
