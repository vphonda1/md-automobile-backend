const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const Invoice = require('../models/Invoice');
const Part = require('../models/Part');
const JobCard = require('../models/JobCard');
const Salary = require('../models/Salary');

router.get('/', async (req, res) => {
  try {
    const { year, month, day } = req.query;
    const now = new Date();
    const filterYear = year ? parseInt(year) : now.getFullYear();
    const filterMonth = month ? parseInt(month) : null;
    const filterDay = day ? parseInt(day) : null;

    // Build date filter for invoices
    const invoiceQuery = {};
    if (filterYear) {
      const start = new Date(filterYear, filterMonth ? filterMonth - 1 : 0, filterDay || 1);
      const end = filterDay
        ? new Date(filterYear, (filterMonth || 1) - 1, filterDay + 1)
        : filterMonth
          ? new Date(filterYear, filterMonth, 1)
          : new Date(filterYear + 1, 0, 1);
      invoiceQuery.invoiceDate = {
        $gte: start.toISOString().split('T')[0],
        $lt: end.toISOString().split('T')[0]
      };
    }

    const [
      totalCustomers,
      totalVehicles,
      soldVehicles,
      inStockVehicles,
      invoices,
      lowStockParts,
      pendingJobCards,
      monthSalaries
    ] = await Promise.all([
      Customer.countDocuments(),
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ status: 'sold' }),
      Vehicle.countDocuments({ status: 'in-stock' }),
      Invoice.find(invoiceQuery),
      Part.find({ $expr: { $lte: ['$stockQuantity', '$minStockLevel'] } }),
      JobCard.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
      Salary.find({ month: `${filterYear}-${String(filterMonth || now.getMonth() + 1).padStart(2, '0')}` })
    ]);

    // Calculate revenue & subsidies from invoices
    const totalRevenue = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const totalSubsidy = invoices.reduce((s, i) => s + (i.totalSubsidy || 0), 0);
    const totalPaid = invoices.reduce((s, i) => s + (i.amountPaid || 0), 0);
    const totalDue = invoices.reduce((s, i) => s + (i.balanceDue || 0), 0);
    const totalSalaryPaid = monthSalaries.reduce((s, x) => s + (x.netSalary || 0), 0);

    // Monthly breakdown
    const monthlyRevenue = {};
    invoices.forEach(inv => {
      const m = (inv.invoiceDate || '').substring(0, 7);
      if (m) monthlyRevenue[m] = (monthlyRevenue[m] || 0) + (inv.totalAmount || 0);
    });

    // Top models
    const modelCounts = {};
    invoices.forEach(inv => {
      if (inv.vehicleModel) modelCounts[inv.vehicleModel] = (modelCounts[inv.vehicleModel] || 0) + 1;
    });

    res.json({
      summary: {
        totalCustomers,
        totalVehicles,
        soldVehicles,
        inStockVehicles,
        totalInvoices: invoices.length,
        totalRevenue,
        totalSubsidy,
        totalPaid,
        totalDue,
        pendingJobCards,
        lowStockParts: lowStockParts.length,
        totalSalaryPaid
      },
      monthlyRevenue,
      topModels: Object.entries(modelCounts).map(([model, count]) => ({ model, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      lowStockParts: lowStockParts.slice(0, 20),
      recentInvoices: invoices.slice(0, 10),
      filter: { year: filterYear, month: filterMonth, day: filterDay },
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Profit/Loss endpoint (MD Automobile simplified - no RTO/insurance margin)
router.get('/pnl', async (req, res) => {
  try {
    const { year, month } = req.query;
    const filterYear = year ? parseInt(year) : new Date().getFullYear();
    const filterMonth = month ? parseInt(month) : null;

    const invoiceQuery = {};
    const start = new Date(filterYear, filterMonth ? filterMonth - 1 : 0, 1);
    const end = filterMonth ? new Date(filterYear, filterMonth, 1) : new Date(filterYear + 1, 0, 1);
    invoiceQuery.invoiceDate = {
      $gte: start.toISOString().split('T')[0],
      $lt: end.toISOString().split('T')[0]
    };

    const invoices = await Invoice.find(invoiceQuery);
    const salaries = await Salary.find({
      month: filterMonth ? `${filterYear}-${String(filterMonth).padStart(2, '0')}` : new RegExp(`^${filterYear}`)
    });

    const vehicleSales = invoices.filter(i => i.invoiceType === 'sale').reduce((s, i) => s + (i.totalAmount || 0), 0);
    const serviceRevenue = invoices.filter(i => i.invoiceType === 'service').reduce((s, i) => s + (i.totalAmount || 0), 0);
    const partsRevenue = invoices.filter(i => i.invoiceType === 'parts').reduce((s, i) => s + (i.totalAmount || 0), 0);
    const salaryExpense = salaries.reduce((s, x) => s + (x.netSalary || 0), 0);

    // Simplified margin (Electric: Vehicle margin + Service + Parts - Salary - other expenses)
    const estimatedMargin = (vehicleSales * 0.08) + serviceRevenue + partsRevenue - salaryExpense;

    res.json({
      vehicleSales,
      serviceRevenue,
      partsRevenue,
      salaryExpense,
      estimatedProfit: estimatedMargin,
      filter: { year: filterYear, month: filterMonth }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
