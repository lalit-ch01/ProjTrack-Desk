import React, { useState } from 'react';

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Change password form submitted:', formData);
  };

  return (
    <div className="container vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="col-md-4">
        <div className="card shadow">
          <div className="card-body">
            <h3 className="mb-4 text-center text-primary">Change Password</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Old Password</label>
                <input type="password" className="form-control" name="oldPassword" onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label">New Password</label>
                <input type="password" className="form-control" name="newPassword" onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Confirm Password</label>
                <input type="password" className="form-control" name="confirmPassword" onChange={handleChange} required />
              </div>
              <button type="submit" className="btn btn-primary w-100">Update Password</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
