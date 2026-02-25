# management/commands/fix_review_calendar_events.py

from django.core.management.base import BaseCommand
from users.models import ProjectReview, CalendarEvent


class Command(BaseCommand):
    help = 'Fix ProjectReviews that are missing calendar_events'

    def handle(self, *args, **options):
        reviews_without_events = ProjectReview.objects.filter(calendar_event__isnull=True)
        
        if not reviews_without_events.exists():
            self.stdout.write(self.style.SUCCESS('All reviews already have calendar events!'))
            return
        
        count = 0
        for review in reviews_without_events:
            # Create calendar event for this review
            calendar_event = CalendarEvent.objects.create(
                title=f"{review.activity.title} - {review.title}",
                description=review.description or f"Review #{review.review_number} for {review.activity.title}",
                start_date=review.review_date,
                end_date=review.review_date,
                created_by=review.activity.created_by,
                event_type='REVIEW'
            )
            review.calendar_event = calendar_event
            review.save()
            count += 1
            self.stdout.write(f"Created calendar event for: {review.title}")
        
        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully created {count} calendar events for reviews!'))
