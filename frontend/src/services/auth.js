class AuthService {
  constructor() {
    this.tokenKey = 'adminToken';
    this.userKey = 'adminUser';
  }

  // Save authentication data
  saveAuth(token, user) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Get token
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  // Get user
  getUser() {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  // Check if authenticated
  isAuthenticated() {
    return !!this.getToken();
  }

  // Clear authentication
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}

const authService = new AuthService();
export default authService;