export class ApiResponse {
  constructor(status = 200, data = null, message = "Success") {
    (this.status = status), (this.data = data);
    this.message = message;
  }
}
