from django.core.management.base import BaseCommand
from users.models import ProjectActivity
from django.utils import timezone
from datetime import datetime, time


class Command(BaseCommand):
    help = 'Fix topic submission deadlines by setting them to end of day (23:59:59)'

    def handle(self, *args, **options):
        activities = ProjectActivity.objects.all()
        
        self.stdout.write(f"Found {activities.count()} activities to check\n")
        
        updated_count = 0
        for activity in activities:
            old_deadline = activity.topic_submission_deadline
            
            # Extract just the date part and set time to end of day (23:59:59)
            if old_deadline:
                # Get the date part
                date_only = old_deadline.date()
                
                # Create a new datetime with end of day time
                new_deadline = datetime.combine(date_only, time(23, 59, 59))
                
                # Make it timezone aware if needed
                if timezone.is_aware(old_deadline):
                    new_deadline = timezone.make_aware(new_deadline)
                
                activity.topic_submission_deadline = new_deadline
                activity.save()
                
                self.stdout.write(self.style.SUCCESS(f"✓ Updated '{activity.title}':"))
                self.stdout.write(f"  Old: {old_deadline}")
                self.stdout.write(f"  New: {new_deadline}\n")
                updated_count += 1
            else:
                self.stdout.write(self.style.WARNING(f"⚠ Skipped '{activity.title}' - No deadline set\n"))
        
        self.stdout.write(self.style.SUCCESS(f"\n✅ Updated {updated_count} deadlines successfully!"))
