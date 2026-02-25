#!/usr/bin/env python
"""
Comprehensive Project Workflow Test Suite
Tests the complete project management workflow from activity creation to evaluation
"""

import os
import sys
import django
import json
from datetime import datetime, timedelta

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projtrack.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from users.models import (
    ProjectActivity, TopicSubmission, ProjectMilestone, 
    MilestoneSubmission, MilestoneEvaluation, CalendarEvent
)

User = get_user_model()

class WorkflowTester:
    def __init__(self):
        self.results = {
            'total_tests': 0,
            'passed_tests': 0,
            'failed_tests': 0,
            'errors': []
        }
        
    def log_test(self, test_name, success, message=""):
        self.results['total_tests'] += 1
        if success:
            self.results['passed_tests'] += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.results['failed_tests'] += 1
            self.results['errors'].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")
    
    def setup_test_users(self):
        """Create test users for each role"""
        try:
            # Create coordinator
            coordinator, created = User.objects.get_or_create(
                username='test_coordinator',
                defaults={
                    'email': 'coordinator@test.com',
                    'role': 'coordinator',
                    'first_name': 'Test',
                    'last_name': 'Coordinator',
                    'department': 'Computer Science'
                }
            )
            if created:
                coordinator.set_password('testpass123')
                coordinator.save()
            
            # Create guide
            guide, created = User.objects.get_or_create(
                username='test_guide',
                defaults={
                    'email': 'guide@test.com',
                    'role': 'guide',
                    'first_name': 'Test',
                    'last_name': 'Guide',
                    'department': 'Computer Science'
                }
            )
            if created:
                guide.set_password('testpass123')
                guide.save()
            
            # Create student
            student, created = User.objects.get_or_create(
                username='test_student',
                defaults={
                    'email': 'student@test.com',
                    'role': 'student',
                    'first_name': 'Test',
                    'last_name': 'Student',
                    'department': 'Computer Science'
                }
            )
            if created:
                student.set_password('testpass123')
                student.save()
            
            self.coordinator = coordinator
            self.guide = guide
            self.student = student
            
            self.log_test("User Setup", True, "All test users created successfully")
            return True
            
        except Exception as e:
            self.log_test("User Setup", False, str(e))
            return False
    
    def test_activity_creation(self):
        """Test Step 1: Project Activity Creation"""
        try:
            # Create a project activity
            activity = ProjectActivity.objects.create(
                title="Test Project Activity",
                description="A test project for workflow validation",
                activity_type="mini_project",
                coordinator=self.coordinator,
                start_date=timezone.now().date(),
                end_date=(timezone.now() + timedelta(days=90)).date(),
                topic_submission_deadline=timezone.now() + timedelta(days=7),
                guidelines="Follow the project guidelines",
                max_team_size=3,
                min_team_size=1,
                status="active",
                is_visible_to_students=True
            )
            
            # Assign to student
            activity.assigned_students.add(self.student)
            
            self.activity = activity
            self.log_test("Activity Creation", True, f"Activity '{activity.title}' created successfully")
            return True
            
        except Exception as e:
            self.log_test("Activity Creation", False, str(e))
            return False
    
    def test_topic_submission(self):
        """Test Step 2: Topic Submission by Student"""
        try:
            # Student submits a topic
            topic = TopicSubmission.objects.create(
                activity=self.activity,
                student=self.student,
                guide=self.guide,
                topic_title="AI-Powered Task Management System",
                topic_description="A web application that uses AI to optimize task scheduling",
                objectives="Build a smart task management system with AI recommendations",
                methodology="Agile development with Python and React",
                expected_outcomes="A working web application with AI features",
                technologies="Python, Django, React, TensorFlow",
                domain="Web Development & AI",
                status="submitted"
            )
            
            self.topic = topic
            self.log_test("Topic Submission", True, f"Topic '{topic.topic_title}' submitted successfully")
            return True
            
        except Exception as e:
            self.log_test("Topic Submission", False, str(e))
            return False
    
    def test_topic_approval(self):
        """Test Step 3: Topic Approval by Guide"""
        try:
            # Guide approves the topic
            self.topic.status = "approved"
            self.topic.reviewed_by = self.guide
            self.topic.reviewed_at = timezone.now()
            self.topic.review_comments = "Great topic! Well thought out approach."
            self.topic.save()
            
            self.log_test("Topic Approval", True, f"Topic approved by guide")
            return True
            
        except Exception as e:
            self.log_test("Topic Approval", False, str(e))
            return False
    
    def test_milestone_creation(self):
        """Test Step 4: Milestone Creation by Coordinator"""
        try:
            # Create milestones for the project
            milestones_data = [
                {
                    'title': 'Project Proposal',
                    'description': 'Submit detailed project proposal',
                    'milestone_type': 'proposal',
                    'weightage': 15,
                    'days_from_start': 14
                },
                {
                    'title': 'System Design',
                    'description': 'Complete system architecture and design',
                    'milestone_type': 'design',
                    'weightage': 20,
                    'days_from_start': 30
                },
                {
                    'title': 'Implementation Phase 1',
                    'description': 'Complete core functionality implementation',
                    'milestone_type': 'implementation',
                    'weightage': 25,
                    'days_from_start': 60
                },
                {
                    'title': 'Final Submission',
                    'description': 'Complete project with documentation',
                    'milestone_type': 'final_submission',
                    'weightage': 40,
                    'days_from_start': 85
                }
            ]
            
            self.milestones = []
            for milestone_data in milestones_data:
                milestone = ProjectMilestone.objects.create(
                    project_activity=self.activity,
                    title=milestone_data['title'],
                    description=milestone_data['description'],
                    due_date=timezone.now() + timedelta(days=milestone_data['days_from_start']),
                    milestone_type=milestone_data['milestone_type'],
                    weightage=milestone_data['weightage'],
                    is_mandatory=True,
                    submission_requirements=f"Submit {milestone_data['title'].lower()} with proper documentation"
                )
                self.milestones.append(milestone)
            
            self.log_test("Milestone Creation", True, f"{len(self.milestones)} milestones created successfully")
            return True
            
        except Exception as e:
            self.log_test("Milestone Creation", False, str(e))
            return False
    
    def test_milestone_submission(self):
        """Test Step 5: Milestone Submission by Student"""
        try:
            # Student submits first milestone
            submission = MilestoneSubmission.objects.create(
                milestone=self.milestones[0],  # Project Proposal
                student=self.student,
                submission_text="Detailed project proposal with objectives and timeline",
                submission_link="https://github.com/student/project-proposal",
                status="submitted"
            )
            
            self.submission = submission
            self.log_test("Milestone Submission", True, f"Milestone submission created successfully")
            return True
            
        except Exception as e:
            self.log_test("Milestone Submission", False, str(e))
            return False
    
    def test_milestone_evaluation(self):
        """Test Step 6: Milestone Evaluation by Guide"""
        try:
            # Guide evaluates the submission
            evaluation = MilestoneEvaluation.objects.create(
                submission=self.submission,
                evaluator=self.guide,
                marks_obtained=85,
                max_marks=100,
                feedback="Excellent proposal with clear objectives and well-defined timeline",
                evaluation_criteria="Content quality, clarity, feasibility, timeline",
                suggestions="Consider adding more details about testing strategy",
                status="completed"
            )
            
            # Update submission status
            self.submission.status = "evaluated"
            self.submission.save()
            
            self.evaluation = evaluation
            self.log_test("Milestone Evaluation", True, f"Milestone evaluated with {evaluation.marks_obtained} marks")
            return True
            
        except Exception as e:
            self.log_test("Milestone Evaluation", False, str(e))
            return False
    
    def test_calendar_integration(self):
        """Test Calendar Event Integration"""
        try:
            # Check if calendar events were created
            milestone_events = CalendarEvent.objects.filter(
                event_type__in=['MILESTONE', 'TOPIC_DEADLINE', 'PROJECT_START', 'PROJECT_END']
            )
            
            events_count = milestone_events.count()
            self.log_test("Calendar Integration", events_count > 0, f"{events_count} calendar events found")
            return events_count > 0
            
        except Exception as e:
            self.log_test("Calendar Integration", False, str(e))
            return False
    
    def test_workflow_data_integrity(self):
        """Test data relationships and integrity"""
        try:
            # Verify relationships
            checks = [
                (self.activity.assigned_students.filter(id=self.student.id).exists(), "Student assigned to activity"),
                (self.topic.activity == self.activity, "Topic linked to activity"),
                (self.topic.student == self.student, "Topic linked to student"),
                (self.topic.guide == self.guide, "Topic linked to guide"),
                (self.milestones[0].project_activity == self.activity, "Milestone linked to activity"),
                (self.submission.milestone == self.milestones[0], "Submission linked to milestone"),
                (self.submission.student == self.student, "Submission linked to student"),
                (self.evaluation.submission == self.submission, "Evaluation linked to submission"),
                (self.evaluation.evaluator == self.guide, "Evaluation linked to guide")
            ]
            
            all_passed = True
            for check, description in checks:
                if not check:
                    all_passed = False
                    self.log_test(f"Data Integrity - {description}", False, "Relationship not found")
                else:
                    self.log_test(f"Data Integrity - {description}", True, "")
            
            return all_passed
            
        except Exception as e:
            self.log_test("Data Integrity", False, str(e))
            return False
    
    def cleanup_test_data(self):
        """Clean up test data"""
        try:
            # Delete in reverse order to maintain referential integrity
            if hasattr(self, 'evaluation'):
                self.evaluation.delete()
            if hasattr(self, 'submission'):
                self.submission.delete()
            if hasattr(self, 'milestones'):
                for milestone in self.milestones:
                    milestone.delete()
            if hasattr(self, 'topic'):
                self.topic.delete()
            if hasattr(self, 'activity'):
                self.activity.delete()
            
            # Optionally delete test users (uncomment if needed)
            # self.coordinator.delete()
            # self.guide.delete()
            # self.student.delete()
            
            self.log_test("Cleanup", True, "Test data cleaned up successfully")
            return True
            
        except Exception as e:
            self.log_test("Cleanup", False, str(e))
            return False
    
    def run_complete_workflow_test(self):
        """Run the complete workflow test suite"""
        print("🚀 Starting Complete Project Workflow Test Suite")
        print("=" * 60)
        
        # Run all test steps
        test_steps = [
            self.setup_test_users,
            self.test_activity_creation,
            self.test_topic_submission,
            self.test_topic_approval,
            self.test_milestone_creation,
            self.test_milestone_submission,
            self.test_milestone_evaluation,
            self.test_calendar_integration,
            self.test_workflow_data_integrity,
            self.cleanup_test_data
        ]
        
        for step in test_steps:
            if not step():
                print(f"\n⚠️  Workflow test failed at step: {step.__name__}")
                break
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.results['total_tests']}")
        print(f"Passed: {self.results['passed_tests']}")
        print(f"Failed: {self.results['failed_tests']}")
        print(f"Success Rate: {(self.results['passed_tests']/self.results['total_tests']*100):.1f}%")
        
        if self.results['errors']:
            print("\n❌ FAILED TESTS:")
            for error in self.results['errors']:
                print(f"  - {error}")
        
        if self.results['failed_tests'] == 0:
            print("\n🎉 ALL TESTS PASSED! Workflow is working correctly.")
        else:
            print(f"\n⚠️  {self.results['failed_tests']} tests failed. Please check the errors above.")

if __name__ == "__main__":
    tester = WorkflowTester()
    tester.run_complete_workflow_test()