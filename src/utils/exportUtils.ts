import * as echarts from 'echarts'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { Dashboard, ChartConfig, DataSource } from '../types'

export async function exportChartAsPNG(chartInstance: echarts.ECharts, filename: string = 'chart') {
  const url = chartInstance.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff'
  })

  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = url
  link.click()
}

export async function exportChartAsSVG(chartInstance: echarts.ECharts, filename: string = 'chart') {
  const url = chartInstance.getDataURL({
    type: 'svg',
    pixelRatio: 2,
    backgroundColor: '#fff'
  })

  const link = document.createElement('a')
  link.download = `${filename}.svg`
  link.href = url
  link.click()
}

export function exportProjectAsJSON(
  dashboards: Dashboard[],
  charts: ChartConfig[],
  dataSources: DataSource[],
  filename: string = 'project'
) {
  const projectData = {
    version: '1.0.0',
    exportedAt: Date.now(),
    dashboards,
    charts,
    dataSources: dataSources.map((ds) => ({
      ...ds,
      rows: ds.rows.slice(0, 1000)
    }))
  }

  const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.download = `${filename}.json`
  link.href = url
  link.click()

  URL.revokeObjectURL(url)
}

export async function exportDashboardAsPDF(
  dashboardElement: HTMLElement,
  filename: string = 'dashboard'
) {
  const canvas = await html2canvas(dashboardElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#fff'
  })

  const imgData = canvas.toDataURL('image/png')
  const imgWidth = 210
  const pageHeight = 297
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  let heightLeft = imgHeight
  let position = 0

  const pdf = new jsPDF('p', 'mm', 'a4')
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  pdf.save(`${filename}.pdf`)
}

export async function importProjectFromJSON(file: File): Promise<{
  dashboards: Dashboard[]
  charts: ChartConfig[]
  dataSources: DataSource[]
}> {
  const text = await file.text()
  const data = JSON.parse(text)

  return {
    dashboards: data.dashboards || [],
    charts: data.charts || [],
    dataSources: data.dataSources || []
  }
}
