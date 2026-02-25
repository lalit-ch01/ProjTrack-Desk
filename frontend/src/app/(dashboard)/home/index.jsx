import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import axiosInstance from '../../../utils/axios';

const Home = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/auth/user/');
      setUserProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWelcomeMessage = () => {
    if (loading) {
      return "Welcome to ProjTrack Desk";
    }
    
    const firstName = userProfile?.first_name || userProfile?.username || "User";
    return `Hey ${firstName}, Welcome to ProjTrack Desk`;
  };

  const getRoleMessage = () => {
    if (loading || !userProfile?.role) {
      return "";
    }
    
    const roleMessages = {
      'admin': 'System Administrator',
      'coordinator': 'Project Coordinator',
      'guide': 'Faculty Guide',
      'student': 'Student'
    };
    
    return roleMessages[userProfile.role] || userProfile.role;
  };
  return (
    <Layout>
          <div className="container-fluid">
            <div className="row">
              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h1 className="h3 mb-0">Dashboard</h1>
                  <div className="text-end">
                    <div className="d-flex align-items-center justify-content-end">
                      <i className="bi bi-person-circle me-2 text-primary" style={{ fontSize: '1.25rem' }}></i>
                      <div className="text-start">
                        <small className="text-muted d-block" style={{ lineHeight: '1.5' }}>
                          {getWelcomeMessage()}
                        </small>
                        {loading ? (
                          <div className="d-flex align-items-center justify-content-start mt-1">
                            <div className="spinner-border spinner-border-sm text-primary" role="status" style={{ width: '0.75rem', height: '0.75rem' }}>
                              <span className="visually-hidden">Loading...</span>
                            </div>
                          </div>
                        ) : getRoleMessage() && (
                          <small className="fw-bold text-primary d-block" style={{ fontSize: '0.75rem', lineHeight: '1' }}>
                            {getRoleMessage()}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="row mb-4">
                  <div className="col-md-3 mb-3">
                    <div className="card text-white bg-primary">
                      <div className="card-body">
                        <div className="d-flex justify-content-between">
                          <div>
                            <h4 className="card-title">25</h4>
                            <p className="card-text">Total Projects</p>
                          </div>
                          <i className="bi bi-folder-fill fs-1"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-3 mb-3">
                    <div className="card text-white bg-success">
                      <div className="card-body">
                        <div className="d-flex justify-content-between">
                          <div>
                            <h4 className="card-title">18</h4>
                            <p className="card-text">Active Projects</p>
                          </div>
                          <i className="bi bi-check-circle-fill fs-1"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-3 mb-3">
                    <div className="card text-white bg-warning">
                      <div className="card-body">
                        <div className="d-flex justify-content-between">
                          <div>
                            <h4 className="card-title">7</h4>
                            <p className="card-text">Pending Review</p>
                          </div>
                          <i className="bi bi-clock-fill fs-1"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-3 mb-3">
                    <div className="card text-white bg-info">
                      <div className="card-body">
                        <div className="d-flex justify-content-between">
                          <div>
                            <h4 className="card-title">45</h4>
                            <p className="card-text">Total Students</p>
                          </div>
                          <i className="bi bi-people-fill fs-1"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-lg-8 mb-4">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title mb-0">Recent Activity</h5>
                      </div>
                      <div className="card-body">
                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex align-items-center">
                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                              <i className="bi bi-file-plus text-white"></i>
                            </div>
                            <div>
                              <p className="mb-1">New project submission received</p>
                              <small className="text-muted">2 hours ago</small>
                            </div>
                          </div>
                          
                          <div className="d-flex align-items-center">
                            <div className="bg-success rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                              <i className="bi bi-check-lg text-white"></i>
                            </div>
                            <div>
                              <p className="mb-1">Project "AI Chatbot" approved</p>
                              <small className="text-muted">5 hours ago</small>
                            </div>
                          </div>
                          
                          <div className="d-flex align-items-center">
                            <div className="bg-warning rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                              <i className="bi bi-exclamation-triangle text-white"></i>
                            </div>
                            <div>
                              <p className="mb-1">Deadline approaching for "Web App"</p>
                              <small className="text-muted">1 day ago</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-lg-4 mb-4">
                    <div className="card">
                      <div className="card-header">
                        <h5 className="card-title mb-0">Quick Actions</h5>
                      </div>
                      <div className="card-body">
                        <div className="d-grid gap-2">
                          <button className="btn btn-primary">
                            <i className="bi bi-plus-circle me-2"></i>
                            New Project
                          </button>
                          <button className="btn btn-outline-primary">
                            <i className="bi bi-upload me-2"></i>
                            Upload Document
                          </button>
                          <button className="btn btn-outline-primary">
                            <i className="bi bi-calendar-plus me-2"></i>
                            Schedule Meeting
                          </button>
                          <button className="btn btn-outline-primary">
                            <i className="bi bi-download me-2"></i>
                            Generate Report
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
    </Layout>
  );
};

export default Home;
