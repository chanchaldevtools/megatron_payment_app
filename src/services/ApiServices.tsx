// src/services/ApiService.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
//export const IMAGE_URL = 'https://truckapp.inextwebs.com/storage/app/public/';
export const IMAGE_URL = 'https://testtruckapp.inextwebs.com/storage/app/public/';

export interface Vehicle {
  id: number;
  vehicle_number: string;
  driver_name: string;
  driver_number: string;
  vehicle_type: string;
  vehicle_model: string;
  status?: 'active' | 'inactive' | 'maintenance';
}

interface ApiResponse {
  vehicles: Vehicle[];
  hasMore: boolean;
  total?: number;
  current_page?: number;
  last_page?: number;
}

// Create Axios instance
// const API = axios.create({
//   baseURL: 'https://truckapp.inextwebs.com/api',
//   timeout: 20000,
// });

const API = axios.create({
  baseURL: 'https://testtruckapp.inextwebs.com/api',
  timeout: 20000,
});

// Add request interceptor for debugging
API.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url, config.params);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// Add response interceptor for debugging
API.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.log('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// Helper to convert object to FormData
const toFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key]);
    }
  });
  return formData;
};

export const apiService = {
login: async (phone: string) => {
    try {
     const formData = new FormData();
     formData.append('phone', phone);
     const response = await API.post(`login`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // if sending FormData
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error Send OTP:', error.response?.data || error.message);
      throw error;
    }
  },
  
  verifyOTP: async (token: string, otp: string) => {
    try {
    const formData = new FormData();
    formData.append('otp', otp);
    formData.append('token', token);
     const response = await API.post(`verify-otp`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // if sending FormData
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error Verify OTP:', error.response?.data || error.message);
      throw error;
    }
  },

  fetchVehicles: async (page = 1, limit = 10): Promise<ApiResponse> => {
    try {
      const response = await API.get('/vehicles', { 
        params: { page, limit } 
      });
      
      // Handle different API response structures
      const responseData = response.data;
      
      if (Array.isArray(responseData)) {
        // If API returns direct array
        return {
          vehicles: responseData,
          hasMore: responseData.length === limit,
        };
      } else if (responseData.data) {
        // If API returns { data: [], current_page, last_page }
        return {
          vehicles: responseData.data,
          hasMore: responseData.current_page < responseData.last_page,
          current_page: responseData.current_page,
          last_page: responseData.last_page,
        };
      } else {
        // If API returns { vehicles: [], hasMore: boolean }
        return {
          vehicles: responseData.vehicles || [],
          hasMore: responseData.hasMore !== false,
        };
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  },
  addVehicle: async (data: {
    vehicle_number: string;
    driver_name: string;
    driver_number: string;
    vehicle_type: string;
    vehicle_model: string;
  }): Promise<Vehicle> => {
    try {
      const response = await API.post('/vehicles', data); // JSON
      return response.data.vehicle || response.data;
    } catch (error) {
     
      throw error;
    }
  },
  updateVehicle: async (id: number, data: Partial<Vehicle>): Promise<Vehicle> => {
  try {
    // Use PUT and send JSON
    const response = await API.put(`/vehicles/${id}`, data); 
    return response.data.vehicle || response.data;
  } catch (error: any) {
    console.error('Error updating vehicle:', error.message, error.response?.data);
    throw error;
  }
},
  deleteVehicle: async (id: number): Promise<void> => {
    try {
      await API.delete(`/vehicles/${id}`);
      
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  },
  TransportList: async (id: number): Promise<void> => {
    try {
      const response = await API.get(`/vehicles/${id}/details`);
      return response.data.transports;
    } catch (error) {
      console.error('Error deleting Transport:', error);
      throw error;
    }
  },
  ChildTransportList: async (id: number): Promise<void> => {
    try {
      const response = await API.post(`${id}/childtransportList`);
      return response.data.transports;
    } catch (error) {
      console.error('Error deleting Transport:', error);
      throw error;
    }
  },
  transportStore: async (vehicleId: number, data: any) => {
    try {
      const formData = toFormData(data); // Convert to FormData if needed
      const response = await API.post(`vehicles/${vehicleId}/transport`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // if sending FormData
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error adding transport:', error.response?.data || error.message);
      throw error;
    }
  },

 generateEmergencyRequest: async (payload: {
    creator_name: string;
    message: string;
    status: string;
    vehicle_id: string;
  }) => {
    try {
      const formData = new FormData();
      formData.append('creator_name', payload.creator_name);
      formData.append('message', payload.message);
      formData.append('status', payload.status);
      formData.append('vehicle_id', payload.vehicle_id);

      console.log('Emergency Request Payload:', {
        creator_name: payload.creator_name,
        message: payload.message,
        status: payload.status,
        vehicle_id: payload.vehicle_id,
      });

      const response = await fetch(
        'https://inextwebs.com/testmode-calculationapp/api/overdue/generate_emergency_request',
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
          },
          body: formData,
        }
      );

      const data = await response.json();
      console.log('Emergency Request Response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send emergency request');
      }

      return data;
    } catch (error) {
      console.error('Emergency request error:', error);
      throw error;
    }
  },



ChildtransportStore: async (vehicleId: number, data: any) => {
    try {
      const formData = toFormData(data); // Convert to FormData if needed
      const response = await API.post(`${vehicleId}/childtransport`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // if sending FormData
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error adding transport:', error.response?.data || error.message);
      throw error;
    }
},
PaymentHistory: async (data: any) => {
    try {
      const formData = toFormData(data); // Convert to FormData if needed
      const response = await API.post(`paymentsHistory`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // if sending FormData
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error adding transport:', error.response?.data || error.message);
      throw error;
    }
},
AddDriverCash: async (data: any) => {
  try {
    const userInfo = await AsyncStorage.getItem('userData');
    const parsed = JSON.parse(userInfo);
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });
    formData.append('added_by', parsed.name);
    if (data.payment_raise_picture && data.payment_raise_picture.startsWith('file')) {
      formData.append('payment_raise_picture', {
        uri: data.payment_raise_picture,
        name: 'payment.jpg',
        type: 'image/jpeg',
      } as any);
    }

    if (data.qr_code_picture && data.qr_code_picture.startsWith('file')) {
      formData.append('qr_code_picture', {
        uri: data.qr_code_picture,
        name: 'pay.jpg',
        type: 'image/jpeg',
      } as any);
    }

    if (data.meter_image && data.meter_image.startsWith('file')) {
      formData.append('meter_image', {
        uri: data.meter_image,
        name: 'pay.jpg',
        type: 'image/jpeg',
      } as any);
    }

    console.log('🚀 Uploading expense with fields:', Array.from(formData));

    const response = await API.post(`paymentsHistoryCreate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ Error adding transport:', error.response?.data || error.message);
    throw error;
  }
},

AllTransactions: async (data: any) => {
    try {
      const formData = toFormData(data); // Convert to FormData if needed
      const response = await API.post(`transactions`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // if sending FormData
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching Transaction:', error.response?.data || error.message);
      throw error;
    }
},

TransactionsFilter: async (data: any) => {
  try {
    const response = await API.get('paymentfilter', { params: data });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching Transaction:', error.response?.data || error.message);
    throw error;
  }
},
GetTripDetails: async (data: any) => {
  try {
    const formData = toFormData(data); 
    const response = await API.post(`getTransportInfo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', 
        },
      });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching Transaction:', error.response?.data || error.message);
    throw error;
  }
},


Calculation: async (data: any) => {
    try {
      const formData = toFormData(data); // Convert to FormData if needed
      const response = await API.post(`calculation`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // if sending FormData
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching calculation:', error.response?.data || error.message);
      throw error;
    }
  },
Report: async (data: any) => {
    try {
      const formData = toFormData(data); // Convert to FormData if needed
      const response = await API.post(`report`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // if sending FormData
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching report:', error.response?.data || error.message);
      throw error;
    }
  },
  UpdatePaymentStatus: async (data: any) => {
    try {
      const formData = toFormData(data); // Convert to FormData if needed
      const userInfo = await AsyncStorage.getItem('userData');
      const parsed = JSON.parse(userInfo);
      formData.append('payments_process', parsed.name);
      const response = await API.post(`Payment-status-change`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // if sending FormData
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error updating payments:', error.response?.data || error.message);
      throw error;
    }
  },
  DeletePayment: async (data: any) => {
    try {
      const formData = toFormData(data); // Convert to FormData if needed
      const response = await API.post(`delete-transaction`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // if sending FormData
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error delete Transaction:', error.response?.data || error.message);
      throw error;
    }
  },
  MakeChecked: async (data: any) => {
    try {
      const formData = toFormData(data); 
      const userInfo = await AsyncStorage.getItem('userData');
      const parsed = JSON.parse(userInfo);
      formData.append('user_name', parsed.name);
      const response = await API.post(`make-complete`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // if sending FormData
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error delete Transaction:', error.response?.data || error.message);
      throw error;
    }
  },
  ApplyGcharge: async (data: any) => {
    try {
      const formData = toFormData(data);
      const response = await API.post(`vehicles/g-charge-apply`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error delete Transaction:', error.response?.data || error.message);
      throw error;
    }
  },
  editrate: async (data:any) => {
        try {
            const formData = new FormData();
            formData.append('transport_id', data.transport_id);
            formData.append('rate', data.rate);
            formData.append('waight', data.waight);
            formData.append('type', data.type);
            formData.append('trip_id',data.trip_id);

            const response = await API.post(`editrate`,formData,
                {
                    headers: {
                       
                        'Content-Type': 'multipart/form-data', 
                    },
                }
            );
            console.log("Edit Rate API Response:", response.data); 
            
            return response.data; 

        } catch (error) {
            console.error("Error in editrate API call:", error);

            throw error; 
        }
    },
    UploadDocument: async (formData: any) => {
  try {
   
    const response = await API.post(`upload-written-expense`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data', 
        },
      });
    return response.data;
  } catch (error: any) {
    console.error('Error uploading Document:', error.response?.data || error.message);
    throw error;
  }
},
GetTransportDocument: async (transportId:any) => {
    try {
        const response = await API.get(`/get-transport-document/${transportId}`);
        return response.data; // Yeh 'written_doc_url' return karega
    } catch (error) {
        console.error("Fetch Doc Error:", error);
        throw error;
    }
},
SyncWrittenDocument: async (formData:any) => {
    try {
        const response = await API.post(`/upload-written-expense`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
        });
        return response.data;
    } catch (error) {
        console.error("Sync Doc Error:", error);
        throw error;
    }
  },
   GetDrivers: async () => {
    try {
      const response = await API.get(`/drivers`);
      return response.data;
    } catch (error) {
      console.error("Get Drivers Error:", error.response?.data || error.message);
      throw error.response?.data || { message: 'Failed to fetch drivers' };
    }
  },

  // Create new driver
  CreateDriver: async (driverData:any) => {
    try {
      const response = await API.post(`/drivers`, driverData);
      return response.data;
    } catch (error) {
      console.error("Create Driver Error:", error.response?.data || error.message);
      throw error.response?.data || { message: 'Failed to create driver' };
    }
  },

  // Update driver
  UpdateDriver: async (id :any, driverData:any) => {
    try {
      const response = await API.put(`/drivers/${id}`, driverData);
      return response.data;
    } catch (error) {
      console.error("Update Driver Error:", error.response?.data || error.message);
      throw error.response?.data || { message: 'Failed to update driver' };
    }
  },

  // Delete driver
  DeleteDriver: async (id:any) => {
    try {
      const response = await API.delete(`/drivers/${id}`);
      return response.data;
    } catch (error) {
      console.error("Delete Driver Error:", error.response?.data || error.message);
      throw error.response?.data || { message: 'Failed to delete driver' };
    }
  },

  // Search drivers
  SearchDrivers: async (searchParams:any) => {
    try {
      const response = await API.get(`/drivers/search`, {
        params: searchParams
      });
      return response.data;
    } catch (error) {
      console.error("Search Drivers Error:", error.response?.data || error.message);
      throw error.response?.data || { message: 'Failed to search drivers' };
    }
  },

  // Get single driver by ID
  GetDriver: async (id:any) => {
    try {
      const response = await API.get(`/drivers/${id}`);
      return response.data;
    } catch (error) {
      console.error("Get Driver Error:", error.response?.data || error.message);
      throw error.response?.data || { message: 'Failed to fetch driver' };
    }
  },
  GetDriverTransactions: async (driverId:any) => {
  try {
    const response = await API.get(`/drivers/${driverId}/transactions`);
    return response.data;
  } catch (error) {
    console.error("Get Transactions Error:", error.response?.data || error.message);
    throw error.response?.data || { message: 'Failed to fetch transactions' };
  }
},

// Create transaction
CreateTransaction: async (driverId:any, transactionData:any) => {
  try {
    const response = await API.post(`/drivers/${driverId}/transactions`, transactionData);
    return response.data;
  } catch (error) {
    console.error("Create Transaction Error:", error.response?.data || error.message);
    throw error.response?.data || { message: 'Failed to create transaction' };
  }
},

// Filter transactions
FilterTransactions: async (driverId:any, filters:any) => {
  try {
    const response = await API.get(`/drivers/${driverId}/transactions/filter`, {
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error("Filter Transactions Error:", error.response?.data || error.message);
    throw error.response?.data || { message: 'Failed to filter transactions' };
  }
},

// Delete multiple transactions
DeleteMultipleTransactions: async (driverId:any, data:any) => {
  try {
    const response = await API.post(`/drivers/${driverId}/transactions/delete-multiple`, data);
    return response.data;
  } catch (error) {
    console.error("Delete Multiple Error:", error.response?.data || error.message);
    throw error.response?.data || { message: 'Failed to delete transactions' };
  }
}
};
