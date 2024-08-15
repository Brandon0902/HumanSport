const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { check, validationResult } = require("express-validator");
const autentifica = require("../middleware/autentificajwt");

const Membership = mongoose.model("Membership");
const Course = mongoose.model("Course");
const User = mongoose.model("User");
const Payment = mongoose.model("Payment");

//Obrener la lista de pagos
router.get("/", autentifica, async (req, res) => {
  try {
    const payments = await Payment.find({}).populate(['userId', 'membershipId']);
    res.json(payments);
  } catch (err) {
    res.status(500).send("Error al obtener la lista de pagos");
  }
});

/*
{
  userId: '',
  membershipId: '',
  amount: 10000,
  method: 'cash',
  status: 'pending',
}
*/
// POST /payments - Crear un nuevo pago
router.post(
  "/",
  autentifica,
  [
    check("userId").notEmpty().withMessage("El ID del usuario es requerido"),
    check("membershipId")
      .notEmpty()
      .withMessage("El ID de la membresía es requerido"),
    check("amount").notEmpty().withMessage("El monto es requerido"),
    check("method").notEmpty().withMessage("El método de pago es requerido"),
  ],
  async (req, res) => {
    const { userId, membershipId, amount, method } = req.body;

    try {
      // Buscar el usuario por nombre y teléfono
      const foundUser = await User.findById(userId);
      if (!foundUser) {
        return res.status(404).json({ message: `Usuario no encontrado.` });
      }

      // Buscar el curso por nombre
      const foundMembership = await Membership.findById(membershipId);
      if (!foundMembership) {
        return res.status(404).json({ message: `Membresía no encontrada.` });
      }

      if (amount <= 0) {
        return res.status(404).json({ message: `Monto de pago no válido.` });
      }

      // Crear el nuevo booking con las referencias al usuario y curso
      const payment = new Payment({
        userId,
        membershipId,
        amount,
        method,
        status: method === 'cash' ? 'completed' : 'pending'
      });

      const savedPayment = await payment.save();
      res
        .status(201)
        .json({
          message: "Pago registrado exitosamente",
          payment: savedPayment,
        });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error al crear la reserva", error: err.toString() });
    }
  }
);



// Obtener un curso por ID
router.get('/:id', autentifica, async (req, res, next) => {
  try {
    let payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).send('Pago no encontrado');
    }
    res.send(payment);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
