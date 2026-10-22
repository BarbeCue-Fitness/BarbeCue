"""Trigger idempotent seed data for the pilot. Run: backend/.venv/bin/python -m scripts.seed"""

import random
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.matching import VOCAB  # noqa: E402
from app.models import (  # noqa: E402
    PREFER_NOT_TO_SAY,  # noqa: E402
    Attribute,
    Match,
    Message,
    Photo,
    Swipe,
    SwipeAction,
    User,
    UserAttribute,
    match_between,
    new_id,
    now_utc,
)
from app.security import hash_password  # noqa: E402

DEMO_EMAIL = "demo@barbecue.app"
DEMO_PASSWORD = "demopass123"
# Bengaluru demo point so seeded users spread 1–25 km around the demo account
CENTER = (12.9716, 77.5946)

NAMES = [
    "Sakshi",
    "Riya",
    "Ananya",
    "Muskan",
    "Tanya",
    "Ishita",
    "Simran",
    "Neha",
    "Aarav",
    "Kabir",
    "Meera",
    "Dev",
    "Nisha",
    "Rahul",
    "Priya",
    "Arjun",
    "Sana",
    "Karan",
    "Ira",
    "Vikram",
    "Vera",
    "Aditya",
    "Tanvi",
    "Rohan",
    "Anjali",
    "Sahil",
    "Divya",
    "Nikhil",
    "Pooja",
    "Siddharth",
    "Kiara",
    "Yash",
    "Gauri",
    "Manav",
    "Ritu",
    "Farhan",
    "Alia",
    "Sanjay",
    "Lavanya",
    "Om",
    "Zoya",
    "Rajat",
    "Trisha",
    "Harsh",
    "Bani",
    "Ritesh",
    "Mitali",
    "Ajay",
    "Sneha",
    "Vivek",
]
BIOS = [
    "Lift, long walks, good food and better conversations.",
    "Runner, occasional yogi and enthusiastic brunch planner.",
    "New to lifting and happy to learn. One week at a time.",
    "Strength training, pilates and a very serious relationship with my playlist.",
    "Working on my first pull-up. Into climbing and mobility.",
    "Getting back into movement and making workouts a happy part of the week.",
    "Consistency beats intensity. Training partner wanted.",
    "Home workouts, weekend hikes, weekday discipline.",
]
PROMPTS = [
    "A gym buddy who shows up, pushes hard and grows together.",
    "Someone to make the sunrise runs feel shorter.",
    "A partner for focused sessions and a celebratory smoothie after.",
    "Someone kind, consistent and up for a post-workout coffee.",
    "Let's build habits, not excuses.",
    "Train, chat, repeat.",
]
SCHEDULES = [
    "Weekdays after 6:00 PM",
    "Mon/Wed/Fri mornings",
    "Early mornings on weekdays",
    "Tue/Thu evenings, weekends",
    "Mon–Sat, 7:00 AM",
    "Weekend mornings",
    "Weekday mornings",
]
FOCUS = ["Strength", "Strength Training", "Running", "Fitness", "Calisthenics", "Pilates", "Yoga", "Weight Loss", "Boxing", "Cycling"]
GENDERS = ["Female", "Male", "Non-binary"]
LEVELS = ["Beginner", "Intermediate", "Advanced"]


def offset_coords(distance_km: float, rng: random.Random) -> tuple[float, float]:
    rng.uniform(0, 2 * 3.14159)
    dlat = distance_km * rng.uniform(0.3, 1.0) * -1 if rng.random() < 0.5 else distance_km * rng.uniform(0.3, 1.0)
    dlon = (distance_km**2 - dlat**2) ** 0.5 * (1 if rng.random() < 0.5 else -1)
    return round(CENTER[0] + dlat / 111.0, 2), round(CENTER[1] + dlon / (111.0 * 0.86), 2)


def ensure_attributes(db) -> dict[tuple[str, str], Attribute]:
    cache: dict[tuple[str, str], Attribute] = {}
    for kind, values in VOCAB.items():
        for value in values:
            if value == PREFER_NOT_TO_SAY:
                continue
            found = db.query(Attribute).filter(Attribute.kind == kind, Attribute.value == value).first()
            if not found:
                found = Attribute(kind=kind, value=value)
                db.add(found)
                db.flush()
            cache[(kind, value)] = found
    return cache


def add_attributes(db, cache, user: User, kind: str, values: list[str]) -> None:
    for value in values:
        attribute = cache.get((kind, value))
        if attribute is None:  # free text value not in vocab: create it on the fly
            attribute = Attribute(kind=kind, value=value)
            db.add(attribute)
            db.flush()
            cache[(kind, value)] = attribute
        user.attributes.append(UserAttribute(user_id=user.id, attribute_id=attribute.id))


def build_user(db, rng: random.Random, index: int, cache) -> User:
    name = NAMES[index % len(NAMES)]
    email = f"{name.lower()}{index}@barbecue.dev"
    km = rng.uniform(1.0, 25.0)
    lat, lng = offset_coords(km, rng)
    body_types = VOCAB["body_type"]
    diets = VOCAB["diet"]
    activity = VOCAB["activity_level"]
    keep_private = index % 5 == 0
    user = User(
        id=new_id(),
        email=email,
        # one shared pilot password keeps the demo usable; change before any public exposure
        password_hash=hash_password(DEMO_PASSWORD),
        name=name,
        date_of_birth=date(1998 + (index % 7), 1 + (index % 12), 1 + (index % 27)),
        gender=GENDERS[index % len(GENDERS)] if not keep_private else None,
        bio=f"{BIOS[index % len(BIOS)]}",
        prompt=PROMPTS[index % len(PROMPTS)],
        focus=FOCUS[index % len(FOCUS)],
        fitness_level=LEVELS[index % len(LEVELS)],
        schedule=SCHEDULES[index % len(SCHEDULES)],
        height_cm=rng.randint(150, 190) if not keep_private else None,
        latitude=lat,
        longitude=lng,
        location_updated_at=now_utc(),
        standout=index % 4 == 0,
        last_seen_at=now_utc() - timedelta(minutes=rng.randint(0, 20000)),
    )
    add_attributes(db, cache, user, "interest", rng.sample(VOCAB["interest"], 3))
    add_attributes(db, cache, user, "goal", rng.sample(VOCAB["goal"], 2))
    add_attributes(db, cache, user, "language", rng.sample(VOCAB["language"], 1 + index % 2))
    diet = None if keep_private else diets[index % (len(diets) - 1)]  # last entry is PNTS → keep NULL
    body_type = None if keep_private else body_types[index % (len(body_types) - 1)]
    level = None if keep_private else activity[index % (len(activity) - 1)]
    for kind, value in (("diet", diet), ("body_type", body_type), ("activity_level", level)):
        if value:
            attribute = cache[(kind, value)]
            user.__setattr__(f"{kind}_id", attribute.id)
    db.add(user)
    db.flush()
    pic_ids = [((index * 7 + offset) % 84) + 1 for offset in range(3)]
    for position, photo_id in enumerate(pic_ids):
        db.add(Photo(user_id=user.id, url=f"https://i.pravatar.cc/600?img={photo_id}", position=position))
    return user


def seed() -> None:
    db = SessionLocal()
    demo = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if demo:
        print("Seed already applied (demo account exists) — nothing to do.")
        db.close()
        return
    Base.metadata.create_all(engine)  # pilot bootstrap; Alembic is the source of truth for schema
    cache = ensure_attributes(db)
    rng = random.Random(42)  # fixed seed = reproducible seed data

    demo = User(
        id=new_id(),
        email=DEMO_EMAIL,
        password_hash=hash_password(DEMO_PASSWORD),
        name="Demo User",
        date_of_birth=date(1997, 5, 10),
        gender="Male",
        bio="Just here to lift heavy things and find good people to lift them with.",
        prompt="A reliable workout partner for good sessions and better conversations.",
        focus="Strength",
        fitness_level="Intermediate",
        schedule="Mon/Wed/Fri 6:00 AM, Sat 9:00 AM",
        height_cm=173,
        latitude=CENTER[0],  # demo user sits at the center of the seeded cloud
        longitude=CENTER[1],
        location_updated_at=now_utc(),
        standout=False,
        last_seen_at=now_utc(),
    )
    db.add(demo)
    db.flush()
    add_attributes(db, cache, demo, "interest", ["Powerlifting", "Nutrition", "Running"])
    add_attributes(db, cache, demo, "goal", ["Build muscle", "Stay consistent"])
    add_attributes(db, cache, demo, "language", ["English"])
    demo.diet_id = cache[("diet", "High protein")].id
    demo.body_type_id = cache[("body_type", "Athletic")].id
    demo.activity_level_id = cache[("activity_level", "High")].id
    for position, photo_id in enumerate([15, 16, 17]):
        db.add(Photo(user_id=demo.id, url=f"https://i.pravatar.cc/600?img={photo_id}", position=position))

    profiles = [build_user(db, rng, i, cache) for i in range(49)]
    db.flush()

    lover = profiles[38]  # "Zoya" — inbound like waiting in Likes-you
    db.add(Swipe(swiper_id=lover.id, target_id=demo.id, action=SwipeAction.like))

    matched = profiles[5]  # "Ananya"-era friend — live match with a chat thread
    db.add(Swipe(swiper_id=matched.id, target_id=demo.id, action=SwipeAction.like))
    db.add(Swipe(swiper_id=demo.id, target_id=matched.id, action=SwipeAction.like))
    a, b = match_between(demo.id, matched.id)
    match = Match(user_a_id=a, user_b_id=b)
    db.add(match)
    db.flush()
    now = now_utc()
    thread = [
        (matched.id, "Hey! You're into strength training too?", 60),  # minutes ago, unread
        (demo.id, "Yes! Been consistent for the past 6 months.", 55),
        (matched.id, "We should work out together sometime 💪", 50),
    ]
    for sender_id, text, minutes_ago in thread:
        db.add(
            Message(
                match_id=match.id,
                sender_id=sender_id,
                body=text,
                created_at=now - timedelta(minutes=minutes_ago),
                read_at=None if minutes_ago == 50 else (now - timedelta(minutes=minutes_ago - 1)),
            )
        )
    db.commit()
    print(f"Seeded {len(profiles)} profiles + demo ({DEMO_EMAIL}) — match with {matched.name}, like from {lover.name}.")


if __name__ == "__main__":
    seed()
