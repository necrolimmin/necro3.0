from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Promote a NovaStream user to admin by email."

    def add_arguments(self, parser):
        parser.add_argument("email")

    def handle(self, *args, **options):
        User = get_user_model()
        try:
            user = User.objects.get(email=options["email"])
        except User.DoesNotExist as exc:
            raise CommandError("User not found") from exc
        user.role = "admin"
        user.is_staff = True
        user.save(update_fields=["role", "is_staff"])
        self.stdout.write(self.style.SUCCESS(f"{user.email} is now admin"))
