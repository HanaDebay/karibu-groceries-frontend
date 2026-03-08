<template>
  <div class="sa-layout">
    <aside :class="['sa-sidebar', { collapsed: sidebarCollapsed, 'mobile-active': !sidebarCollapsed && isMobile }]">
      <div class="sa-logo">
        <img src="/images/logo.png" alt="KGL Logo" />
        <button class="sa-toggle-btn" type="button" @click="toggleSidebar"><i class="fa-solid fa-bars"></i></button>
      </div>

      <nav>
        <a href="#" :class="{ active: activeTab === 'dashboard' }" @click.prevent="showDashboard"><i class="fa-solid fa-chart-line"></i><span>Dashboard</span></a>
        <a href="#" :class="{ active: activeTab === 'record' }" @click.prevent="switchTab('record')"><i class="fa-solid fa-cart-shopping"></i><span>Record Sale</span></a>
        <a href="#" :class="{ active: activeTab === 'stock' }" @click.prevent="switchTab('stock')"><i class="fa-solid fa-warehouse"></i><span>View Stock</span></a>
        <a href="#" :class="{ active: activeTab === 'my-sales' }" @click.prevent="switchTab('my-sales')"><i class="fa-solid fa-receipt"></i><span>My Sales</span></a>
        <a href="#" @click.prevent="logout"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></a>
      </nav>
    </aside>

    <!-- Mobile Overlay -->
    <div 
      v-if="isMobile && !sidebarCollapsed" 
      class="sidebar-overlay" 
      @click="sidebarCollapsed = true"
    ></div>

    <main class="sa-main">
      <!-- Mobile Header -->
      <header class="mobile-header" v-if="isMobile">
        <button class="mobile-toggle-btn" @click="toggleSidebar">
          <i class="fa-solid fa-bars"></i>
        </button>
        <span class="mobile-title">Sales Agent Dashboard</span>
      </header>

      <template v-if="activeTab === 'dashboard'">
        <header class="sa-topbar">
          <h3>Welcome, {{ auth.userName || 'Sales Agent' }}</h3>
          <span>{{ branchLabel }}</span>
        </header>

        <section class="sa-cards">
          <div class="sa-card"><h4>Today's Sales</h4><p>UGX {{ todaySales.toLocaleString() }}</p></div>
          <div class="sa-card"><h4>Produce Sold</h4><p>{{ produceSold.toLocaleString() }} KG</p></div>
          <div class="sa-card"><h4>Credit Sales</h4><p>UGX {{ creditSales.toLocaleString() }}</p></div>
          <div class="sa-card"><h4>Available Produce</h4><p>{{ availableProduce }} Types</p></div>
        </section>

        <section class="sa-charts">
          <div class="sa-chart-box"><h4>My Weekly Sales (UGX)</h4><canvas ref="weeklySalesCanvas"></canvas></div>
          <div class="sa-chart-box"><h4>Produce Sold Breakdown (KG)</h4><canvas ref="produceCanvas"></canvas></div>
        </section>
      </template>

      <SalesAgentRecordSale v-else-if="activeTab === 'record'" />
      <SalesAgentStockView v-else-if="activeTab === 'stock'" @sell="activeTab = 'record'" />
      <SalesAgentMySales v-else-if="activeTab === 'my-sales'" />
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Chart } from 'chart.js/auto'
import { useAuthStore } from '../stores/auth'
import { apiFetch } from '../services/api'
import SalesAgentRecordSale from '../components/SalesAgentRecordSale.vue'
import SalesAgentStockView from '../components/SalesAgentStockView.vue'
import SalesAgentMySales from '../components/SalesAgentMySales.vue'

const router = useRouter()
const auth = useAuthStore()

const sidebarCollapsed = ref(false)
const isMobile = ref(false)
const activeTab = ref('dashboard')

const todaySales = ref(0)
const produceSold = ref(0)
const creditSales = ref(0)
const availableProduce = ref(0)

const weeklySalesCanvas = ref(null)
const produceCanvas = ref(null)
let weeklySalesChart = null
let produceChart = null

const branchLabel = computed(() => `${auth.branch || 'Branch'} Branch`)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function showDashboard() {
  activeTab.value = 'dashboard'
  if (isMobile.value) sidebarCollapsed.value = true
  nextTick(async () => {
    destroyCharts()
    initCharts()
    await fetchDashboardData()
  })
}

function switchTab(tab) {
  activeTab.value = tab
  if (isMobile.value) sidebarCollapsed.value = true
}

function logout() {
  auth.clearAuth()
  router.push({ name: 'landing' })
}

function initCharts() {
  if (weeklySalesCanvas.value && !weeklySalesChart) {
    weeklySalesChart = new Chart(weeklySalesCanvas.value, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Sales (UGX)', data: [], borderColor: '#2c3e50', backgroundColor: '#2c3e50', borderWidth: 3, tension: 0.4 }] }
    })
  }
  if (produceCanvas.value && !produceChart) {
    produceChart = new Chart(produceCanvas.value, {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'KG Sold', data: [], borderWidth: 1, backgroundColor: '#2c3e50' }] }
    })
  }
}

function destroyCharts() {
  if (weeklySalesChart) {
    weeklySalesChart.destroy()
    weeklySalesChart = null
  }
  if (produceChart) {
    produceChart.destroy()
    produceChart = null
  }
}

async function fetchDashboardData() {
  const token = auth.token
  const userName = auth.userName
  const userBranch = auth.branch
  if (!token || !userName) return

  const salesRes = await apiFetch('/api/sales')
  if (salesRes.ok) {
    const allSales = salesRes.data?.data || []
    const mySales = allSales.filter((sale) => sale.salesAgent === userName || sale.recordedBy === userName)
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const weeklySalesData = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
    const produceSoldMap = {}
    let todayTotal = 0
    let soldTotal = 0
    let creditTotal = 0
    const t = new Date()
    const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`

    for (const sale of mySales) {
      const amount = Number(sale.amount || sale.amountPaid || sale.amountDue || 0)
      const tonnage = Number(sale.tonnage || 0)
      soldTotal += tonnage
      if (sale.saleType === 'credit' || Number(sale.amountDue || 0) > 0) creditTotal += amount

      const effectiveDate = sale.date || sale.dispatchDate
      if (effectiveDate) {
        const dateObj = new Date(effectiveDate)
        if (!Number.isNaN(dateObj.getTime())) {
          const day = dateObj.toLocaleDateString('en-GB', { weekday: 'short' })
          if (Object.prototype.hasOwnProperty.call(weeklySalesData, day)) weeklySalesData[day] += Number(sale.amount || 0)
          const saleDateStr = String(effectiveDate).split('T')[0]
          if (saleDateStr === todayStr || dateObj.toLocaleDateString('en-CA') === todayStr) todayTotal += amount
        }
      }

      if (sale.produceName && tonnage > 0) {
        produceSoldMap[sale.produceName] = (produceSoldMap[sale.produceName] || 0) + tonnage
      }
    }

    todaySales.value = todayTotal
    produceSold.value = soldTotal
    creditSales.value = creditTotal

    if (weeklySalesChart) {
      weeklySalesChart.data.labels = weekDays
      weeklySalesChart.data.datasets[0].data = weekDays.map((d) => weeklySalesData[d])
      weeklySalesChart.update()
    }
    if (produceChart) {
      produceChart.data.labels = Object.keys(produceSoldMap)
      produceChart.data.datasets[0].data = Object.values(produceSoldMap)
      produceChart.update()
    }
  }

  const stockRes = await apiFetch('/api/procurement')
  if (stockRes.ok) {
    const procurements = stockRes.data?.data || []
    const availableItems = new Set()
    for (const item of procurements) {
      if (item.branch === userBranch && Number(item.stock || 0) > 0) availableItems.add(item.produceName)
    }
    availableProduce.value = availableItems.size
  }
}

// Handle Window Resize
function handleResize() {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value) {
    sidebarCollapsed.value = true
  } else {
    sidebarCollapsed.value = false
  }
}

onMounted(async () => {
  if (!auth.token) {
    router.push({ name: 'login' })
    return
  }
  handleResize()
  window.addEventListener('resize', handleResize)

  initCharts()
  await fetchDashboardData()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  destroyCharts()
})
</script>

<style scoped>
.sa-layout { display: flex; min-height: 100vh; background: #f4f6f8; }
.sa-sidebar { width: 250px; background: #2c3e50; color: #fff; padding: 20px; position: sticky; top: 0; height: 100vh; overflow-y: auto; align-self: flex-start; transition: width .3s ease; }
.sa-sidebar.collapsed { width: 80px; }
.sa-sidebar.collapsed nav span { display: none; }
.sa-logo { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }
.sa-logo img { width: 30px; height: 30px; border-radius: 50%; background: #fff; padding: 2px; }
.sa-toggle-btn { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.35); border-radius: 6px; padding: 6px 10px; cursor: pointer; }
.sa-sidebar nav a { display: flex; align-items: center; gap: 10px; color: #d4af37; text-decoration: none; padding: 12px; margin: 8px 0; border-radius: 6px; }
.sa-sidebar.collapsed nav a { justify-content: center; }
.sa-sidebar nav a.active,
.sa-sidebar nav a:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-left: 4px solid #d4af37;
  padding-left: 8px; /* Original padding is 12px, reduced to keep content aligned */
}
.sa-main { flex: 1; padding: 20px; }
.sa-topbar { background: #fff; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; margin-bottom: 20px; }
.sa-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px; }
.sa-card { background: #fff; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,.1); }
.sa-card h4 { color: #d4af37; }
.sa-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.sa-chart-box { background: #fff; padding: 20px; border-radius: 10px; }

/* Mobile Header */
.mobile-header { display: none; align-items: center; background: #fff; padding: 15px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.mobile-toggle-btn { background: none; border: none; font-size: 1.2rem; color: #2c3e50; cursor: pointer; margin-right: 15px; }
.mobile-title { font-weight: bold; color: #2c3e50; }

/* Mobile Overlay */
.sidebar-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; }

@media (max-width: 768px) { 
  .sa-layout { flex-direction: column; } 
  
  .sa-sidebar { 
    position: fixed; 
    left: 0; 
    top: 0; 
    bottom: 0; 
    width: 250px; 
    transform: translateX(-100%); 
    z-index: 1000; 
  }

  .sa-sidebar.mobile-active {
    transform: translateX(0);
  }

  .sa-sidebar.collapsed { 
    width: 250px;
    transform: translateX(-100%);
  }

  .sa-main { margin-left: 0; width: 100%; }

  .mobile-header { display: flex; }

  .sa-topbar { display: none; }

  .sa-sidebar .sa-toggle-btn {
    display: none;
  }
}
</style>
