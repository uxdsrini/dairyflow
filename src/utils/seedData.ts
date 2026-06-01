import { Timestamp } from 'firebase/firestore';

export const products = [
  { id: 'prod_1', name: 'Cow Milk', unit: 'Litre', pricePerUnit: 60, category: 'Milk' },
  { id: 'prod_2', name: 'Buffalo Milk', unit: 'Litre', pricePerUnit: 70, category: 'Milk' },
  { id: 'prod_3', name: 'Curd', unit: 'Kg', pricePerUnit: 80, category: 'Dairy' },
  { id: 'prod_4', name: 'Ghee', unit: 'Kg', pricePerUnit: 650, category: 'Dairy' },
  { id: 'prod_5', name: 'Paneer', unit: 'Kg', pricePerUnit: 350, category: 'Dairy' }
];

export const workers = [
  { id: 'work_1', name: 'Amit Singh', mobile: '9876543201', role: 'delivery_boy', salaryType: 'monthly', monthlySalary: 12000, status: 'active', joiningDate: Timestamp.now() },
  { id: 'work_2', name: 'Ravi Kumar', mobile: '9876543202', role: 'delivery_boy', salaryType: 'monthly', monthlySalary: 11500, status: 'active', joiningDate: Timestamp.now() },
  { id: 'work_3', name: 'Sita Ram', mobile: '9876543203', role: 'milking_worker', salaryType: 'monthly', monthlySalary: 10000, status: 'active', joiningDate: Timestamp.now() },
  { id: 'work_4', name: 'Geeta Devi', mobile: '9876543204', role: 'cleaner', salaryType: 'daily', monthlySalary: 6000, status: 'active', joiningDate: Timestamp.now() },
  { id: 'work_5', name: 'Vijay Sharma', mobile: '9876543205', role: 'manager', salaryType: 'monthly', monthlySalary: 20000, status: 'active', joiningDate: Timestamp.now() }
];

export const customers = [
  { id: 'cust_1', name: 'Anil Gupta', mobile: '9812345601', address: 'Flat 101, Sunshine Apts, Sector 15', route: 'Sector 15', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_2', name: 'Sanjay Dutt', mobile: '9812345602', address: 'House 43, Road No 2, Sector 15', route: 'Sector 15', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_3', name: 'Meena Sharma', mobile: '9812345603', address: 'Flat 304, Royal Palms, Sector 16', route: 'Sector 16', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_4', name: 'Preeti Verma', mobile: '9812345604', address: 'House 12, Lane C, Sector 16', route: 'Sector 16', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_5', name: 'Vikram Malhotra', mobile: '9812345605', address: 'A-45, Green Meadows, Sector 17', route: 'Sector 17', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_6', name: 'Rajesh Nair', mobile: '9812345606', address: 'House 220, Sector 17', route: 'Sector 17', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_7', name: 'Arjun Kapoor', mobile: '9812345607', address: 'Flat 502, Skyview Residency, Sector 21', route: 'Sector 21', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_8', name: 'Kiran Bedi', mobile: '9812345608', address: 'House 88, Lane 1, Sector 21', route: 'Sector 21', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_9', name: 'Pooja Hegde', mobile: '9812345609', address: 'C-109, Grand Plaza, Sector 22', route: 'Sector 22', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_10', name: 'Vivek Oberoi', mobile: '9812345610', address: 'House 56, Sector 22', route: 'Sector 22', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_11', name: 'Royal Cafe', mobile: '9812345611', address: 'Shop 14, Main Market, Sector 15', route: 'Sector 15', customerType: 'commercial', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_12', name: 'Sweet Home Bakery', mobile: '9812345612', address: 'Shop 8, Food Plaza, Sector 16', route: 'Sector 16', customerType: 'commercial', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_13', name: 'Dairy Point', mobile: '9812345613', address: 'Shop 2, Junction Market, Sector 21', route: 'Sector 21', customerType: 'wholesale', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_14', name: 'Rohan Joshi', mobile: '9812345614', address: 'Flat 12, Block B, Sector 22', route: 'Sector 22', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_15', name: 'Aditi Rao', mobile: '9812345615', address: 'Villa 5, Silver Oak Estates, Sector 17', route: 'Sector 17', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_16', name: 'Neha Kakkar', mobile: '9812345616', address: 'Flat 701, Oasis Apts, Sector 21', route: 'Sector 21', customerType: 'residential', status: 'inactive', createdAt: Timestamp.now() },
  { id: 'cust_17', name: 'Karan Johar', mobile: '9812345617', address: 'Penthouse B, Sky Towers, Sector 22', route: 'Sector 22', customerType: 'residential', status: 'inactive', createdAt: Timestamp.now() },
  { id: 'cust_18', name: 'Delhi Sweets', mobile: '9812345618', address: 'Corner Stall, Sector 15 Market', route: 'Sector 15', customerType: 'wholesale', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_19', name: 'Sunil Shetty', mobile: '9812345619', address: 'House 19, Lane A, Sector 17', route: 'Sector 17', customerType: 'residential', status: 'active', createdAt: Timestamp.now() },
  { id: 'cust_20', name: 'Alia Bhatt', mobile: '9812345620', address: 'Flat 405, Kapoor Nivas, Sector 16', route: 'Sector 16', customerType: 'residential', status: 'active', createdAt: Timestamp.now() }
];

export const subscriptions = [
  { id: 'sub_1', customerId: 'cust_1', customerName: 'Anil Gupta', milkType: 'cow', quantityPerDay: 2, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 60, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_2', customerId: 'cust_2', customerName: 'Sanjay Dutt', milkType: 'buffalo', quantityPerDay: 1.5, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 70, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_3', customerId: 'cust_3', customerName: 'Meena Sharma', milkType: 'cow', quantityPerDay: 1, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 60, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_4', customerId: 'cust_4', customerName: 'Preeti Verma', milkType: 'a2', quantityPerDay: 2, frequency: 'alternate', startDate: Timestamp.now(), pricePerLitre: 80, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_5', customerId: 'cust_5', customerName: 'Vikram Malhotra', milkType: 'mixed', quantityPerDay: 3, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 55, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_6', customerId: 'cust_6', customerName: 'Rajesh Nair', milkType: 'cow', quantityPerDay: 1, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 60, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_7', customerId: 'cust_7', customerName: 'Arjun Kapoor', milkType: 'buffalo', quantityPerDay: 2, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 70, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_8', customerId: 'cust_8', customerName: 'Kiran Bedi', milkType: 'cow', quantityPerDay: 1.5, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 60, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_9', customerId: 'cust_9', customerName: 'Pooja Hegde', milkType: 'a2', quantityPerDay: 1, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 80, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_10', customerId: 'cust_10', customerName: 'Vivek Oberoi', milkType: 'cow', quantityPerDay: 2, frequency: 'alternate', startDate: Timestamp.now(), pricePerLitre: 60, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_11', customerId: 'cust_11', customerName: 'Royal Cafe', milkType: 'mixed', quantityPerDay: 10, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 50, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_12', customerId: 'cust_12', customerName: 'Sweet Home Bakery', milkType: 'buffalo', quantityPerDay: 8, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 65, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_13', customerId: 'cust_13', customerName: 'Dairy Point', milkType: 'mixed', quantityPerDay: 25, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 48, status: 'active', createdAt: Timestamp.now() },
  { id: 'sub_14', customerId: 'cust_14', customerName: 'Rohan Joshi', milkType: 'cow', quantityPerDay: 1.5, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 60, status: 'paused', createdAt: Timestamp.now() },
  { id: 'sub_15', customerId: 'cust_15', customerName: 'Aditi Rao', milkType: 'buffalo', quantityPerDay: 2, frequency: 'daily', startDate: Timestamp.now(), pricePerLitre: 70, status: 'active', createdAt: Timestamp.now() }
];

export const orders = [
  { id: 'ord_1', customerId: 'cust_1', customerName: 'Anil Gupta', productId: 'prod_3', productName: 'Curd', quantity: 2, price: 160, orderDate: Timestamp.now(), orderStatus: 'delivered', paymentStatus: 'paid', createdAt: Timestamp.now() },
  { id: 'ord_2', customerId: 'cust_3', customerName: 'Meena Sharma', productId: 'prod_4', productName: 'Ghee', quantity: 1, price: 650, orderDate: Timestamp.now(), orderStatus: 'delivered', paymentStatus: 'paid', createdAt: Timestamp.now() },
  { id: 'ord_3', customerId: 'cust_5', customerName: 'Vikram Malhotra', productId: 'prod_5', productName: 'Paneer', quantity: 1.5, price: 525, orderDate: Timestamp.now(), orderStatus: 'delivered', paymentStatus: 'unpaid', createdAt: Timestamp.now() }
];

export const payments = [
  { id: 'pay_1', customerId: 'cust_1', customerName: 'Anil Gupta', amount: 1500, method: 'upi', date: Timestamp.now(), notes: 'May Bill UPI', createdAt: Timestamp.now() },
  { id: 'pay_2', customerId: 'cust_3', customerName: 'Meena Sharma', amount: 1200, method: 'cash', date: Timestamp.now(), notes: 'Handed to Ravi', createdAt: Timestamp.now() }
];

export const attendance = [
  { id: 'att_1', workerId: 'work_1', workerName: 'Amit Singh', date: new Date().toISOString().split('T')[0], status: 'present' },
  { id: 'att_2', workerId: 'work_2', workerName: 'Ravi Kumar', date: new Date().toISOString().split('T')[0], status: 'present' },
  { id: 'att_3', workerId: 'work_3', workerName: 'Sita Ram', date: new Date().toISOString().split('T')[0], status: 'present' },
  { id: 'att_4', workerId: 'work_4', workerName: 'Geeta Devi', date: new Date().toISOString().split('T')[0], status: 'half_day' },
  { id: 'att_5', workerId: 'work_5', workerName: 'Vijay Sharma', date: new Date().toISOString().split('T')[0], status: 'present' }
];

export const deliveries = [
  {
    id: 'del_1',
    date: new Date().toISOString().split('T')[0],
    customerId: 'cust_1',
    customerName: 'Anil Gupta',
    customerAddress: 'Flat 101, Sunshine Apts, Sector 15',
    type: 'subscription',
    sourceId: 'sub_1',
    items: [{ productName: 'Cow Milk', quantity: 2, unit: 'Litre' }],
    route: 'Sector 15',
    workerId: 'work_1',
    workerName: 'Amit Singh',
    status: 'delivered',
    createdAt: Timestamp.now()
  },
  {
    id: 'del_2',
    date: new Date().toISOString().split('T')[0],
    customerId: 'cust_2',
    customerName: 'Sanjay Dutt',
    customerAddress: 'House 43, Road No 2, Sector 15',
    type: 'subscription',
    sourceId: 'sub_2',
    items: [{ productName: 'Buffalo Milk', quantity: 1.5, unit: 'Litre' }],
    route: 'Sector 15',
    workerId: 'work_1',
    workerName: 'Amit Singh',
    status: 'delivered',
    createdAt: Timestamp.now()
  }
];

export const invoices = [
  {
    id: 'inv_1',
    customerId: 'cust_1',
    customerName: 'Anil Gupta',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    items: [
      { description: 'Cow Milk Subscription', quantity: 60, rate: 60, amount: 3600 },
      { description: 'Curd One-time', quantity: 2, rate: 80, amount: 160 }
    ],
    totalAmount: 3760,
    paidAmount: 1500,
    pendingAmount: 2260,
    status: 'partial',
    createdAt: Timestamp.now()
  }
];

export const expenses = [
  // Transportation Expenses
  { id: 'exp_1', title: 'Milk Collection Trip', category: 'transportation', amount: 500, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Fuel Station', notes: 'Collected milk from local farms', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_2', title: 'Delivery Vehicle Maintenance', category: 'transportation', amount: 1200, expenseDate: Timestamp.now(), paymentMethod: 'upi', vendorName: 'Auto Repair Shop', notes: 'Vehicle servicing', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_3', title: 'Fuel for Delivery', category: 'transportation', amount: 800, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Petrol Pump', notes: 'Monthly fuel expenses', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_4', title: 'Vehicle Insurance', category: 'transportation', amount: 3000, expenseDate: Timestamp.now(), paymentMethod: 'bank_transfer', vendorName: 'Insurance Company', notes: 'Monthly insurance premium', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_5', title: 'Transport of Milk Cans', category: 'transportation', amount: 400, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Transport Services', notes: 'Bulk milk transportation', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_6', title: 'Vehicle Toll Charges', category: 'transportation', amount: 300, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Toll Plaza', notes: 'Monthly toll charges', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_7', title: 'Driver Advance', category: 'transportation', amount: 5000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Driver Fund', notes: 'Advance given to driver', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_8', title: 'Vehicle Rent', category: 'transportation', amount: 2000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Vehicle Owner', notes: 'Rented vehicle for delivery', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_9', title: 'GPS Tracking Device', category: 'transportation', amount: 1500, expenseDate: Timestamp.now(), paymentMethod: 'upi', vendorName: 'Tech Store', notes: 'Monthly GPS subscription', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_10', title: 'Vehicle Registration Renewal', category: 'transportation', amount: 2500, expenseDate: Timestamp.now(), paymentMethod: 'bank_transfer', vendorName: 'RTO Office', notes: 'Annual registration', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  
  // Cattle Feed Expenses
  { id: 'exp_11', title: 'Premium Cow Feed', category: 'feed', amount: 8000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Animal Feed Supplier', notes: '100kg premium feed', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_12', title: 'Buffalo Feed', category: 'feed', amount: 6000, expenseDate: Timestamp.now(), paymentMethod: 'upi', vendorName: 'Feed Store', notes: '80kg buffalo feed', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_13', title: 'Hay and Straw', category: 'feed', amount: 3000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Agricultural Supplier', notes: 'Monthly hay stock', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_14', title: 'Mineral Supplements', category: 'feed', amount: 2500, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Veterinary Supplier', notes: 'Cattle mineral mix', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_15', title: 'Green Fodder Seeds', category: 'feed', amount: 1500, expenseDate: Timestamp.now(), paymentMethod: 'upi', vendorName: 'Seeds Store', notes: 'Fodder seeds purchase', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_16', title: 'Grain Feed Supply', category: 'feed', amount: 7500, expenseDate: Timestamp.now(), paymentMethod: 'bank_transfer', vendorName: 'Grain Merchant', notes: '150kg mixed grains', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_17', title: 'Silage Purchase', category: 'feed', amount: 4000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Silage Supplier', notes: 'Monthly silage stock', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_18', title: 'Concentrate Feed', category: 'feed', amount: 5000, expenseDate: Timestamp.now(), paymentMethod: 'upi', vendorName: 'Feed Mill', notes: 'Protein concentrate', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_19', title: 'Salt and Minerals', category: 'feed', amount: 1000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Chemical Store', notes: 'Lick blocks and salt', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_20', title: 'Vitamin Supplement', category: 'feed', amount: 2000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Veterinary Clinic', notes: 'Vitamin injections and oral supplements', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  
  // Medicine Expenses
  { id: 'exp_21', title: 'Veterinary Check-up', category: 'medicine', amount: 2000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Vet Clinic', notes: 'Monthly health check', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_22', title: 'Antibiotic Medicine', category: 'medicine', amount: 3000, expenseDate: Timestamp.now(), paymentMethod: 'upi', vendorName: 'Pharmacy', notes: 'Antibiotics for cattle', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_23', title: 'Vaccination Program', category: 'medicine', amount: 5000, expenseDate: Timestamp.now(), paymentMethod: 'bank_transfer', vendorName: 'Veterinary Department', notes: 'Routine vaccinations', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_24', title: 'Parasite Treatment', category: 'medicine', amount: 1500, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Vet Pharmacy', notes: 'De-worming medication', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_25', title: 'Emergency Medical Treatment', category: 'medicine', amount: 4000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Animal Hospital', notes: 'Emergency surgery', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  
  // Maintenance Expenses
  { id: 'exp_26', title: 'Farm Shed Repair', category: 'maintenance', amount: 8000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Construction Worker', notes: 'Roof and wall repairs', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_27', title: 'Milking Machine Repair', category: 'maintenance', amount: 3000, expenseDate: Timestamp.now(), paymentMethod: 'upi', vendorName: 'Machine Service Center', notes: 'Machine maintenance', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_28', title: 'Cleaning Supplies', category: 'maintenance', amount: 1000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Supply Store', notes: 'Disinfectants and detergents', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_29', title: 'Fence Maintenance', category: 'maintenance', amount: 2000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Labor', notes: 'Fence repair and replacement', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_30', title: 'Drain Cleaning', category: 'maintenance', amount: 1500, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Plumber', notes: 'Farm drainage maintenance', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  
  // Worker Advance Expenses
  { id: 'exp_31', title: 'Worker Monthly Advance', category: 'worker_advance', amount: 5000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Amit Singh', notes: 'Advance salary to worker', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_32', title: 'Emergency Worker Loan', category: 'worker_advance', amount: 10000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Ravi Kumar', notes: 'Emergency financial assistance', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  
  // Utilities and Other Expenses
  { id: 'exp_33', title: 'Electricity Bill', category: 'electricity', amount: 3000, expenseDate: Timestamp.now(), paymentMethod: 'bank_transfer', vendorName: 'Electric Board', notes: 'Monthly power consumption', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_34', title: 'Packaging Materials', category: 'packaging', amount: 2000, expenseDate: Timestamp.now(), paymentMethod: 'cash', vendorName: 'Packaging Supplier', notes: 'Bottles and containers', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
  { id: 'exp_35', title: 'Equipment Repair', category: 'equipment_repair', amount: 2500, expenseDate: Timestamp.now(), paymentMethod: 'upi', vendorName: 'Equipment Service', notes: 'Cooler maintenance', createdBy: 'user1', createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
];
