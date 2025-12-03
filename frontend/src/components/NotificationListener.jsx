import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../utils/socket";
import { toast } from "react-toastify";

export default function NotificationListener({ user }) {
    const navigate = useNavigate();

    useEffect(() => {
        if(!user?._id) return;

        socket.emit("register", user._id);

        // Request notification permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        socket.on("new-notification", (data) => {
            // Check if this is a service request notification for service providers
            const isServiceRequestNotification = data.type === "service_request" || data.title?.toLowerCase().includes("service request");

            const toastOptions = {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            };

            // Add navigation for service request notifications to service providers
            if (isServiceRequestNotification && user?.role === "Service Provider") {
                toastOptions.onClick = () => navigate("/user/clients");
            }

            toast.info(`${data.title}: ${data.message}`, toastOptions);

            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
                const browserNotification = new Notification(data.title, {
                    body: data.message,
                    icon: '/skillconnect.png', // Assuming there's an icon in public folder
                });

                // Add click handler for browser notification too
                if (isServiceRequestNotification && user?.role === "Service Provider") {
                    browserNotification.onclick = () => {
                        window.focus();
                        navigate("/user/clients");
                    };
                }
            }
        });

        socket.on("appointment-notification", (data) => {

            toast.info(`${data.title}: ${new Date(data.appointment.appointmentDate).toLocaleString()}`, {
                position: "top-right",
                autoClose: 8000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
        });


        socket.on("verification-status", (data) => {
            toast.info(`Verification status updated: ${data.status}`, {
                position: "top-right",
                autoClose: 8000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
        });

        socket.on("request-cancelled", (data) => {

            toast.warn(
                data.message || "A service request was been cancelled.",
                {
                    position: "top-right",
                    autoClose: 8000,
                    hideProgressBar: false,
                }
            );
        });

        socket.on("service-request-updated", (data) => {
            if(data.action === "cancelled") {
                toast.info("A service request has been cancelled.", {
                    position: "top-right",
                    autoClose: 8000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
            }
        });

        socket.on("request-accepted", () => {
            toast.success("A service request has been accepted.", {
                position: "top-right",
                autoClose: 8000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        });

        return () => {
            socket.off("new-notification");
            socket.off("appointment-notification");
            socket.off("verification-status");
            socket.off("request-cancelled");
            socket.off("service-request-updated");
            socket.off("request-accepted");
        };
    }, [user, navigate]);

    return null;
}
