import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const Home = () => {
  return (
    <div>
      <Navbar />
      <div className="d-flex">
        <Sidebar />
        <main className="flex-grow-1" style={{ marginLeft: '250px', marginTop: '56px', padding: '2rem' }}>
          <div className="container-fluid">
            <div className="row">
              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h1 className="h3 mb-0">Dashboard</h1>
                  <small className="text-muted">Welcome to ProjTrack Desk</small>
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
        </main>
      </div>
    </div>
  );
};

export default Home;