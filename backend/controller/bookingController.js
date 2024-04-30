// Import required modules and schemas
import Booking from "../models/bookingSchema.js";
import User from "../models/userSchema.js";
import Flight from "../models/flightSchema.js";
import Airline from "../models/airlineSchema.js";
import Ticket from "../models/ticketSchema.js";

export const getCheckoutSession = async (req, res) => {
  try {
    // Extract user ID from query parameter or token
    const userId = req.query.userId || req.token.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const flight = await Flight.findById(req.params.flightId).populate("airline");

    if (!flight) {
      return res.status(404).json({ success: false, message: "Flight not found" });
    }

    if (!flight.bookedSeats) {
      flight.bookedSeats = [];
    }

    const { bookingUsersData = {}, selectedSeats = [] } = req.body;

    if (!selectedSeats.length) {
      return res.status(400).json({ success: false, message: "No seats selected" });
    }

    const bookingUID = generateUID();
    let ticket = await Ticket.findOne({ uid: bookingUID });

    if (!ticket) {
      ticket = new Ticket({ uid: bookingUID, tickets: [] });
    }

    const numPassengers = selectedSeats.length;

    if (Object.keys(bookingUsersData).length !== numPassengers) {
      return res.status(400).json({ success: false, message: "Invalid passenger data" });
    }

    for (let i = 0; i < numPassengers; i++) {
      const userData = bookingUsersData[`passenger${i + 1}`];
      const seat = selectedSeats[i];

      if (!userData) {
        return res.status(400).json({ success: false, message: `Missing passenger data for passenger${i + 1}` });
      }

      const booking = new Booking({
        flight: flight._id,
        user: user._id,
        seat,
        fName: userData.firstName,
        lName: userData.lastName,
        dob: userData.dob,
        passportNumber: userData.passportNumber,
        state: userData.state,
        phoneNumber: userData.phoneNumber,
        email: userData.email,
        passportSizePhoto: userData.passportSizePhoto,
      });

      const savedBooking = await booking.save();
      ticket.tickets.push(savedBooking._id);
    }

    user.bookings.push(ticket._id);
    await Promise.all([ticket.save(), user.save()]);
    flight.bookedSeats.push(...selectedSeats);
    await flight.save();

    res.status(200).json({ success: true, message: "Booking created successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function to generate a UID
function generateUID() {
  // Generate a random alphanumeric string
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let uid = "";
  for (let i = 0; i < 10; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
}
