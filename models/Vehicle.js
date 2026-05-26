const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  // Identity
  chassisNo: { type: String, required: true, unique: true, index: true, trim: true },
  vehicleModel: { type: String, required: true, trim: true },
  variant: { type: String, trim: true },
  color: { type: String, trim: true },
  manufactureYear: { type: Number },

  // Linked customer (after sale)
  customerName: { type: String, trim: true },
  mobileNo: { type: String, trim: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

  // Electric-specific specs
  batteryCapacity: { type: String, default: '' },   // "3 kWh"
  batteryNumber: { type: String, trim: true },
  motorPower: { type: String, default: '' },        // "5 kW"
  motorNumber: { type: String, trim: true },
  rangeKm: { type: Number, default: 0 },            // 80 km
  topSpeed: { type: Number, default: 0 },           // 60 km/h
  chargingTime: { type: String, default: '' },      // "4 hours"

  // Warranty
  batteryWarrantyDate: { type: String, default: '' },     // 1 year
  motorWarrantyDate: { type: String, default: '' },       // 1 year
  controllerWarrantyDate: { type: String, default: '' },  // 1 year
  vehicleWarrantyDate: { type: String, default: '' },     // 1 year

  // Pricing
  exShowroomPrice: { type: Number, default: 0 },
  fameSubsidy: { type: Number, default: 0 },
  stateSubsidy: { type: Number, default: 0 },
  onRoadPrice: { type: Number, default: 0 },

  // Status
  status: { type: String, default: 'in-stock' }, // in-stock, sold, reserved, transit
  saleDate: { type: String, default: '' },
  arrivalDate: { type: String, default: '' },

  // Optional registration (electric)
  registrationNo: { type: String, default: '' },

  // Battery health tracking
  lastBatteryCheckDate: { type: String, default: '' },
  batteryHealthPercent: { type: Number, default: 100 },
  chargeCycles: { type: Number, default: 0 },

  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

VehicleSchema.pre('save', function(next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
