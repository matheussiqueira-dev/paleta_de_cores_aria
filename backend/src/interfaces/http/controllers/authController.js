"use strict";

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  register = async (req, res) => {
    const result = await this.authService.register(req.body);
    res.status(201).json({
      success: true,
      data: result,
    });
  };

  login = async (req, res) => {
    const result = await this.authService.login(req.body);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  refresh = async (req, res) => {
    const result = await this.authService.refresh(req.body.refreshToken);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  logout = async (req, res) => {
    const result = await this.authService.logout(req.body.refreshToken);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  logoutAll = async (req, res) => {
    const result = await this.authService.logoutAll(req.auth.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  profile = async (req, res) => {
    const result = await this.authService.getProfile(req.auth.userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  };

  changePassword = async (req, res) => {
    const result = await this.authService.changePassword(req.auth.userId, req.body);
    res.status(200).json({
      success: true,
      data: result,
    });
  };
}

module.exports = {
  AuthController,
};
