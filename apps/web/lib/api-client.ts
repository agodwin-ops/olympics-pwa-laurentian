const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    // Remove trailing slash to prevent double slashes in URLs
    this.baseURL = baseURL.replace(/\/$/, '');
    
    // Load token from localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('olympics_auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('olympics_auth_token', token);
      } else {
        localStorage.removeItem('olympics_auth_token');
      }
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config: RequestInit = {
        headers: this.getHeaders(),
        ...options,
      };

      const response = await fetch(url, config);
      
      if (response.status === 401) {
        // Token expired or invalid
        this.setToken(null);
        throw new Error('Authentication required');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.detail || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Authentication
  async register(formData: FormData): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseURL}/api/auth/register`, {
      method: 'POST',
      body: formData, // Don't set Content-Type for FormData
    });

    const data = await response.json();
    
    if (response.ok && data.access_token) {
      this.setToken(data.access_token);
      return { success: true, data };
    }

    return { success: false, error: data.detail || 'Registration failed' };
  }

  async login(email: string, password: string): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('username', email);  // OAuth2 uses 'username' field for email
    formData.append('password', password);

    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (response.ok && data.access_token) {
      this.setToken(data.access_token);
      return { success: true, data };
    }

    return { success: false, error: data.detail || 'Login failed' };
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.request('/api/auth/me');
  }

  async logout(): Promise<void> {
    this.setToken(null);
  }

  // Student endpoints
  async getMyProfile(): Promise<ApiResponse<any>> {
    return this.request('/api/students/me/profile');
  }

  async getMyStats(): Promise<ApiResponse<any>> {
    return this.request('/api/students/me/stats');
  }

  async getMySkills(): Promise<ApiResponse<any>> {
    return this.request('/api/students/me/skills');
  }

  // REMOVED: Leaderboard access removed for student privacy
  // async getLeaderboard(): Promise<ApiResponse<any>> {
  //   return this.request('/api/students/leaderboard');
  // }

  async getGameboardStations(): Promise<ApiResponse<any>> {
    return this.request('/api/students/gameboard/stations');
  }

  async rollDice(stationId: number, skillLevel: number, successChance: number): Promise<ApiResponse<any>> {
    return this.request('/api/students/gameboard/roll-dice', {
      method: 'POST',
      body: JSON.stringify({
        station_id: stationId,
        skill_level: skillLevel,
        success_chance: successChance,
        roll_result: Math.floor(Math.random() * 100) + 1,
        was_successful: Math.random() * 100 <= successChance
      }),
    });
  }

  // Admin endpoints
  async getAllStudents(): Promise<ApiResponse<any>> {
    return this.request('/api/admin/students');
  }

  async getAdminStats(): Promise<ApiResponse<any>> {
    return this.request('/api/admin/stats');
  }

  async getAssignments(): Promise<ApiResponse<any>> {
    return this.request('/api/admin/assignments');
  }

  async getUnits(): Promise<ApiResponse<any>> {
    return this.request('/api/admin/units');
  }

  async createAssignment(assignment: {
    name: string;
    description?: string;
    unit_id: string;
    max_xp: number;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/admin/assignments', {
      method: 'POST',
      body: JSON.stringify(assignment),
    });
  }

  async awardAssignmentXP(award: {
    target_user_id: string;
    assignment_id: string;
    xp_awarded: number;
    description?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/admin/award-xp', {
      method: 'POST',
      body: JSON.stringify(award),
    });
  }

  async bulkAward(bulkData: {
    award_type: string;
    amount: number;
    description?: string;
    target_user_ids?: string[];
  }): Promise<ApiResponse<any>> {
    return this.request('/api/admin/bulk-award', {
      method: 'POST',
      body: JSON.stringify(bulkData),
    });
  }

  async awardStudent(award: {
    type: string;
    target_user_id: string;
    amount: number;
    assignment_id?: string;
    skill_type?: string;
    description?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/admin/award', {
      method: 'POST',
      body: JSON.stringify(award),
    });
  }

  async bulkAwardStudents(awards: Array<{
    type: string;
    target_user_id: string;
    amount: number;
    assignment_id?: string;
    skill_type?: string;
    description?: string;
  }>): Promise<ApiResponse<any>> {
    return this.request('/api/admin/bulk-award', {
      method: 'POST',
      body: JSON.stringify({ awards }),
    });
  }

  async getActivityLog(limit = 50, offset = 0): Promise<ApiResponse<any>> {
    return this.request(`/api/admin/activity-log?limit=${limit}&offset=${offset}`);
  }

  // Utility methods
  async checkAdminCode(code: string): Promise<ApiResponse<any>> {
    return this.request(`/api/auth/check-admin-code?code=${encodeURIComponent(code)}`);
  }

  async initializePlayerData(userId: string): Promise<ApiResponse<any>> {
    return this.request('/api/auth/initialize-player', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // Student Management endpoints
  async batchRegisterStudents(students: Array<{
    email: string;
    username: string;
    user_program: string;
  }>, defaultPassword = 'Olympics2024!'): Promise<ApiResponse<any>> {
    return this.request('/api/admin/batch-register-students', {
      method: 'POST',
      body: JSON.stringify({
        students,
        default_password: defaultPassword
      }),
    });
  }

  async addSingleStudent(student: {
    email: string;
    username: string;
    user_program: string;
    temporary_password?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/admin/add-student', {
      method: 'POST',
      body: JSON.stringify({
        ...student,
        temporary_password: student.temporary_password || 'GamePass123!'
      }),
    });
  }

  async resetStudentPassword(studentEmail: string, newPassword = 'NewPass123!'): Promise<ApiResponse<any>> {
    return this.request('/api/admin/reset-student-password', {
      method: 'POST',
      body: JSON.stringify({
        student_email: studentEmail,
        new_temporary_password: newPassword
      }),
    });
  }

  // Student endpoints
  async changePassword(passwords: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/students/me/change-password', {
      method: 'POST',
      body: JSON.stringify(passwords),
    });
  }

  // Resource Management endpoints
  async getLectures(unitId?: string, publishedOnly?: boolean): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (unitId) params.append('unit_id', unitId);
    if (publishedOnly) params.append('published_only', publishedOnly.toString());
    
    const queryString = params.toString();
    return this.request(`/api/lectures${queryString ? `?${queryString}` : ''}`);
  }

  async createLecture(lectureData: {
    title: string;
    description?: string;
    unit_id?: string;
    order_index?: number;
    is_published?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/lectures', {
      method: 'POST',
      body: JSON.stringify(lectureData),
    });
  }

  async updateLecture(lectureId: string, updates: {
    title?: string;
    description?: string;
    unit_id?: string;
    order_index?: number;
    is_published?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.request(`/api/lectures/${lectureId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteLecture(lectureId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/lectures/${lectureId}`, {
      method: 'DELETE',
    });
  }

  async uploadFileToLecture(
    lectureId: string,
    file: File,
    description?: string,
    isPublic: boolean = true
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description || '');
    formData.append('is_public', isPublic.toString());

    const response = await fetch(`${this.baseURL}/api/lectures/${lectureId}/upload`, {
      method: 'POST',
      headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.detail || 'Upload failed' };
    }

    return { success: true, data };
  }

  async deleteResource(resourceId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/resources/${resourceId}`, {
      method: 'DELETE',
    });
  }

  downloadResource(resourceId: string): string {
    // Returns download URL - the browser will handle the actual download
    return `${this.baseURL}/api/resources/${resourceId}/download`;
  }

  async getResourceAccessLogs(resourceId: string, limit = 50, offset = 0): Promise<ApiResponse<any>> {
    return this.request(`/api/resources/${resourceId}/access-logs?limit=${limit}&offset=${offset}`);
  }

  async getDownloadStats(): Promise<ApiResponse<any>> {
    return this.request('/api/stats/downloads');
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
export type { ApiResponse };