import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401) {
      const loginPaths = ["/admin/login", "/donor/login", "/patient/login"];
      const requestPath = originalRequest.url;
      const isLoginPath = loginPaths.some((path) => requestPath.endsWith(path));

      if (!isLoginPath && !originalRequest._retry) {
        originalRequest._retry = true;

        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("patientStats");

        window.dispatchEvent(new Event("storage"));
        window.location.href = "/login";
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;

export const loginUser = async (role, credentials) => {
  const res = await api.post(`/${role}/login`, credentials);
  return res.data;
};

export const registerUser = async (role, userData) => {
  const res = await api.post(`/${role}/register`, userData);
  return res.data;
};

export const logoutUser = async (role) => {
  const res = await api.post(`/${role}/logout`);
  return res.data;
};

export const getAdminDashboardStats = async () => {
  const res = await api.get("/admin/dashboard/stats");
  return res.data;
};

export const updateBloodStock = async (bloodGroup, unit) => {
  const res = await api.patch("/admin/stock", { bloodGroup, unit });
  return res.data;
};

export const getAllDonationRequestsAdmin = async () => {
  const res = await api.get("/admin/donations");
  return res.data;
};

export const handleDonationRequestAdmin = async (
  requestId,
  action,
  adminComments
) => {
  const res = await api.patch("/admin/donation-requests", {
    requestId,
    action,
    adminComments,
  });
  return res.data;
};

export const getAllBloodRequestsAdmin = async () => {
  const res = await api.get("/admin/bloods");
  return res.data;
};

export const handleBloodRequestAdmin = async (
  requestId,
  action,
  adminComments
) => {
  const res = await api.patch("/admin/blood-requests", {
    requestId,
    action,
    adminComments,
  });
  return res.data;
};

export const getAllBloodRequestHistoryAdmin = async () => {
  const res = await api.get("/admin/blood-requests/history");
  return res.data;
};

export const getAllDonorsAdmin = async () => {
  const res = await api.get("/admin/donors");
  return res.data;
};

export const sendDonorInfoToRequesterAdmin = async (bloodRequestId) => {
  const res = await api.post("/admin/blood-requests/send-donor-info", {
    bloodRequestId,
  });
  return res.data;
};

export const getDonorByIdAdmin = async (id) => {
  const res = await api.get(`/admin/donors/${id}`);
  return res.data;
};

export const updateDonorAdmin = async (id, donorData) => {
  const res = await api.put(`/admin/donors/${id}`, donorData);
  return res.data;
};

export const deleteDonorAdmin = async (id) => {
  const res = await api.delete(`/admin/donors/${id}`);
  return res.data;
};

export const getDonorsByBloodGroupAdmin = async (bloodGroup) => {
  try {
    const response = await api.get(
      `/admin/donors/search?bloodGroup=${bloodGroup}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getAllPatientsAdmin = async () => {
  const res = await api.get("/admin/patients");
  return res.data;
};

export const getPatientByIdAdmin = async (id) => {
  const res = await api.get(`/admin/patients/${id}`);
  return res.data;
};

export const updatePatientAdmin = async (id, patientData) => {
  const res = await api.put(`/admin/patients/${id}`, patientData);
  return res.data;
};

export const deletePatientAdmin = async (id) => {
  const res = await api.delete(`/admin/patients/${id}`);
  return res.data;
};

export const getDonorProfile = async () => {
  const res = await api.get("/donor/profile");
  return res.data;
};

export const updateDonorProfile = async (profileData) => {
  const res = await api.patch("/donor/profile", profileData);
  return res.data;
};

export const requestDonation = async (units, disease) => {
  const res = await api.post("/donor/requestDonation", { units, disease });
  return res.data;
};

export const getDonorDonationHistory = async () => {
  const res = await api.get("/donor/donation-history");
  return res.data;
};

export const requestBloodAsDonor = async (bloodGroup, unit) => {
  const res = await api.post("/donor/request-blood", { bloodGroup, unit });
  return res.data;
};

export const getDonorBloodRequestHistory = async () => {
  const res = await api.get("/donor/request-history");
  return res.data;
};

export const getPatientProfile = async () => {
  const res = await api.get("/patient/profile");
  return res.data;
};

export const updatePatientProfile = async (profileData) => {
  const res = await api.patch("/patient/profile", profileData);
  return res.data;
};

export const getPatientDashboardStats = async () => {
  const res = await api.get("/patient/dashboard");
  return res.data;
};

export const requestBloodAsPatient = async (bloodGroup, unit) => {
  const res = await api.post("/patient/request-blood", { bloodGroup, unit });
  return res.data;
};

export const getPatientBloodRequestHistory = async () => {
  const res = await api.get("/patient/my-request");
  return res.data;
};
