import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import moment from 'moment';
import Layout from '../components/Layout';
import axiosInstance from '../utils/axios';

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const userRole = localStorage.getItem('role');
  const isCoordinator = userRole === 'coordinator';
  const isAdmin = userRole === 'admin';
  const canManageEvents = isCoordinator || isAdmin;

  // Debug logging
  console.log('User role:', userRole);
  console.log('Is coordinator:', isCoordinator);
  console.log('Is admin:', isAdmin);
  console.log('Can manage events:', canManageEvents);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    event_type: 'OTHER'
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axiosInstance.get('/api/calendar/');
      const formattedEvents = response.data.map(event => {
        const startDate = moment(event.start_date).format('YYYY-MM-DD');
        const endDate = moment(event.end_date).format('YYYY-MM-DD');
        
        return {
          id: event.id,
          title: event.title,
          start: startDate,
          end: moment(endDate).add(1, 'day').format('YYYY-MM-DD'), // FullCalendar needs exclusive end date
          description: event.description,
          event_type: event.event_type,
          backgroundColor: getEventColor(event.event_type),
          borderColor: getEventColor(event.event_type),
          allDay: true,
          // Store actual backend dates for editing
          actualStartDate: startDate,
          actualEndDate: endDate
        };
      });
      setEvents(formattedEvents);
    } catch (error) {
      setError('Failed to fetch events: ' + error.message);
    }
  };

  const getEventColor = (eventType) => {
    switch(eventType) {
      case 'REVIEW': return '#0d6efd'; // Professional blue
      case 'SUBMISSION': return '#dc3545'; // Clear red
      case 'MEETING': return '#198754'; // Professional green
      default: return '#6c757d'; // Clean gray
    }
  };

  const handleDateClick = (arg) => {
    if (canManageEvents) {
      setSelectedEvent(null);
      setFormData({
        title: '',
        description: '',
        start_date: moment(arg.date).format('YYYY-MM-DD'),
        end_date: moment(arg.date).format('YYYY-MM-DD'),
        event_type: 'OTHER'
      });
      setShowModal(true);
    }
  };

  const handleEventClick = (arg) => {
    const event = events.find(e => e.id === parseInt(arg.event.id));
    if (!event) return;

    if (canManageEvents) {
      setSelectedEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        start_date: event.actualStartDate,
        end_date: event.actualEndDate,
        event_type: event.event_type
      });
      setShowModal(true);
    } else {
      // For non-managers (students, guides), show read-only modal
      setSelectedEvent(event);
      setShowDetailModal(true);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Form data before submit:', formData);
      
      const eventData = {
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date + 'T09:00:00', // Set to 9 AM
        end_date: formData.end_date + 'T17:00:00', // Set to 5 PM  
        event_type: formData.event_type
      };

      console.log('Event data being sent:', eventData);

      if (selectedEvent) {
        await axiosInstance.put(`/api/calendar/${selectedEvent.id}/`, eventData);
        setSuccess('Event updated successfully');
      } else {
        await axiosInstance.post('/api/calendar/', eventData);
        setSuccess('Event created successfully');
      }

      setShowModal(false);
      fetchEvents();
    } catch (error) {
      setError('Failed to save event: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (selectedEvent && window.confirm('Are you sure you want to delete this event?')) {
      try {
        await axiosInstance.delete(`/api/calendar/${selectedEvent.id}/`);
        setSuccess('Event deleted successfully');
        setShowModal(false);
        fetchEvents();
      } catch (error) {
        setError('Failed to delete event: ' + error.message);
      }
    }
  };

  return (
    <Layout>
          <div className="p-2 p-md-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>Calendar</h2>
              {canManageEvents && (
                <Button variant="primary" onClick={() => {
                  setSelectedEvent(null);
                  setFormData({
                    title: '',
                    description: '',
                    start_date: moment().format('YYYY-MM-DD'),
                    end_date: moment().format('YYYY-MM-DD'),
                    event_type: 'OTHER'
                  });
                  setShowModal(true);
                }}>
                  Add Event
                </Button>
              )}
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      <div style={{ 
                backgroundColor: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        margin: '12px',
        maxWidth: '1200px',
        marginLeft: 'auto',
        marginRight: 'auto'
              }}>
              <style>
                {`
                  /* Clean professional calendar styling */
                  .fc-event {
                    border: none !important;
                    border-radius: 6px !important;
                    font-weight: 600 !important;
                    font-size: 13px !important;
                    padding: 8px 12px !important;
                    margin: 3px 6px !important;
                    min-height: 28px !important;
                    display: flex !important;
                    align-items: center !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                  }
                  
                  .fc-event:hover {
                    transform: translateY(-1px) !important;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
                  }
                  
                  .fc-event-title {
                    color: white !important;
                    font-weight: 600 !important;
                    font-size: 13px !important;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
                  }
                  
                  .fc-daygrid-event {
                    margin: 3px 6px !important;
                    border-radius: 6px !important;
                  }
                  
                  .fc-daygrid-day-frame {
                    min-height: 120px !important;
                    padding: 4px !important;
                  }
                  
                  .fc-day-today {
                    background-color: #f8f9fa !important;
                    border: 2px solid #007bff !important;
                  }
                  
                  .fc-daygrid-day {
                    border: 1px solid #ded7d7ff !important;
                  }
                  
                  .fc-col-header-cell {
                    background-color: #d2f1f1 !important;
                    font-weight: 600 !important;
                    padding: 12px 0 !important;
                    border-bottom: 2px solid #dee2e6 !important;
                  }
                  
                  .fc-scrollgrid {
                    border: 1px solid #dee2e6 !important;
                    border-radius: 8px !important;
                    overflow: hidden !important;
                  }
                  
                  /* Hide previous/next month dates */
                  .fc-day-other {
                    display: none !important;
                  }
                  
                  .fc-daygrid-day.fc-day-other {
                    display: none !important;
                  }
                  
                  /* Ensure only current month dates are visible */
                  .fc-daygrid-day:not(.fc-day-other) {
                    display: table-cell !important;
                  }
                `}
              </style>
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth'
                }}
                events={events}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                height="auto"
                displayEventTime={false}
                eventDisplay="block"
                dayMaxEvents={3}
                moreLinkClick="popover"
                fixedWeekCount={false}
                showNonCurrentDates={false}
                weekNumbers={false}
                eventDidMount={(info) => {
                  // Ensure proper styling is applied
                  const el = info.el;
                  el.style.backgroundColor = info.event.backgroundColor;
                  el.style.borderColor = info.event.borderColor;
                  el.style.color = 'white';
                  el.style.fontWeight = '600';
                  el.style.fontSize = '13px';
                  el.style.padding = '8px 12px';
                  el.style.margin = '3px 6px';
                  el.style.borderRadius = '6px';
                  el.style.minHeight = '28px';
                  el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  el.style.border = 'none';
                }}
              />
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>{selectedEvent ? 'Edit Event' : 'Add Event'}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Title</Form.Label>
                    <Form.Control
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Event Type</Form.Label>
                    <Form.Select
                      name="event_type"
                      value={formData.event_type}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="REVIEW">Project Review</option>
                      <option value="SUBMISSION">Submission Deadline</option>
                      <option value="MEETING">Meeting</option>
                      <option value="OTHER">Other</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>

                  <div className="d-flex justify-content-end gap-2">
                    {selectedEvent && (
                      <Button variant="danger" type="button" onClick={handleDelete}>
                        Delete
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit">
                      {selectedEvent ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </Form>
              </Modal.Body>
            </Modal>

            {/* Read-only Event Detail Modal for non-managers */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>Event Details</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {selectedEvent && (
                  <div>
                    <div className="mb-3">
                      <strong>Type:</strong>{' '}
                      {selectedEvent.event_type === 'REVIEW' ? 'Project Review' :
                       selectedEvent.event_type === 'SUBMISSION' ? 'Submission Deadline' :
                       selectedEvent.event_type === 'MEETING' ? 'Meeting' : 'Other'}
                    </div>
                    <div className="mb-3">
                      <strong>Start Date:</strong> {moment(selectedEvent.actualStartDate).format('MMMM D, YYYY')}
                    </div>
                    <div className="mb-3">
                      <strong>End Date:</strong> {moment(selectedEvent.actualEndDate).format('MMMM D, YYYY')}
                    </div>
                    {selectedEvent.description && (
                      <div className="mb-3">
                        <strong>Description:</strong>
                        <div className="border p-3 mt-2 bg-light rounded">
                          {selectedEvent.description}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>
          </div>
    </Layout>
  );
};

export default CalendarView;