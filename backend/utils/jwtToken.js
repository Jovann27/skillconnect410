const sendToken = (user, statusCode, res, message) => {
  const token = user.getJWTToken?.() ?? user.token;
  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE) || 5;

  const options = {
    expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  };

  const payload = {
    _id: user._id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role || "User",
    profilePic: user.profilePic || "",
    skills: user.skills || [],
    verified: user.verified || false,
    banned: user.banned || false,
    type: "user",
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({ success: true, message, user: payload, token });
};

// sendAdminToken.js
const sendAdminToken = (admin, statusCode, res, message) => {
  const token = admin.getJWTToken();
  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE) || 5;

  const options = {
    expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  };

  const payload = {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: "Admin",
    type: "admin",
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({ success: true, message, user: payload, token });
};

export { sendAdminToken };
export default sendToken;
