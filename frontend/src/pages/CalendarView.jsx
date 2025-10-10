import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import moment from 'moment';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import axiosInstance from '../utils/axios';

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const userRole = localStorage.getItem('role');
  const isCoordinator = userRole === 'coordinator';

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
      const formattedEvents = response.data.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start_date,
        end: event.end_date,
        description: event.description,
        event_type: event.event_type,
        backgroundColor: getEventColor(event.event_type)
      }));
      setEvents(formattedEvents);
    } catch (error) {
      setError('Failed to fetch events: ' + error.message);
    }
  };

  const getEventColor = (eventType) => {
    switch(eventType) {
      case 'REVIEW': return '#007bff';
      case 'SUBMISSION': return '#dc3545';
      case 'MEETING': return '#28a745';
      default: return '#6c757d';
    }
  };

  const handleDateClick = (arg) => {
    if (isCoordinator) {
      setSelectedEvent(null);
      setFormData({
        title: '',
        description: '',
        start_date: moment(arg.date).format('YYYY-MM-DDTHH:mm'),
        end_date: moment(arg.date).add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
        event_type: 'OTHER'
      });
      setShowModal(true);
    }
  };

  const handleEventClick = (arg) => {
    if (isCoordinator) {
      const event = events.find(e => e.id === parseInt(arg.event.id));
      if (event) {
        setSelectedEvent(event);
        setFormData({
          title: event.title,
          description: event.description || '',
          start_date: moment(event.start).format('YYYY-MM-DDTHH:mm'),
          end_date: moment(event.end).format('YYYY-MM-DDTHH:mm'),
          event_type: event.event_type
        });
        setShowModal(true);
      }
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
      const eventData = {
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        event_type: formData.event_type
      };

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
    <div>
      <Navbar />
      <div className="d-flex">
        <Sidebar />
        <div className="flex-grow-1" style={{ marginLeft: '250px', marginTop: '56px' }}>
          <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>Calendar</h2>
              {isCoordinator && (
                <Button variant="primary" onClick={() => {
                  setSelectedEvent(null);
                  setFormData({
                    title: '',
                    description: '',
                    start_date: moment().format('YYYY-MM-DDTHH:mm'),
                    end_date: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
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

            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={events}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                height="auto"
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
                    <Form.Label>Start Date & Time</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>End Date & Time</Form.Label>
                    <Form.Control
                      type="datetime-local"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;