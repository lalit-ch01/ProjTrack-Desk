"""
Script to fix topic_submission_deadline for all activities
This removes the time component and sets all deadlines to end of day
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projtrack.settings')
django.setup()

from users.models import ProjectActivity
from django.utils import timezone
from datetime import datetime, time

def fix_deadlines():
    activities = ProjectActivity.objects.all()
    
    print(f"Found {activities.count()} activities to check")
    
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
            
            print(f"✓ Updated '{activity.title}':")
            print(f"  Old: {old_deadline}")
            print(f"  New: {new_deadline}")
        else:
            print(f"⚠ Skipped '{activity.title}' - No deadline set")
    
    print("\n✅ All deadlines updated successfully!")

if __name__ == '__main__':
    fix_deadlines()
