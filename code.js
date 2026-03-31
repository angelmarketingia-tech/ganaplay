/**
 * Smart Dashboard - Marketing Performance Tracker
 * GanaPlay Dashboard Module
 * 
 * Desarrollado por: Senior Fullstack Developer (JS/Node.js & BI)
 * Propósito: Cálculo de KPIs, proyecciones de inversión y sistemas de alerta para desempeño de pauta.
 */

// ========================================== //
// 1. FUNCIONES CORE DE CÁLCULO (KPIs)        //
// ========================================== //

/**
 * Calcula el Costo por Lead (CPL)
 * Fórmula: Inversión / Registros
 * @param {number} inversion - Monto gastado en pauta
 * @param {number} registros - Usuarios registrados generados
 * @returns {number} CPL calculado
 */
const calculateCPL = (inversion, registros) => {
  if (!registros || registros <= 0) return 0;
  return inversion / registros;
};

/**
 * Calcula el Costo por Adquisición (CPA)
 * Fórmula: Inversión / First Time Deposits (FTDs)
 * @param {number} inversion - Monto gastado en pauta
 * @param {number} ftds - Usuarios que realizaron su primer depósito
 * @returns {number} CPA calculado
 */
const calculateCPA = (inversion, ftds) => {
  if (!ftds || ftds <= 0) return 0;
  return inversion / ftds;
};


// ========================================== //
// 2. SEGUIMIENTO DE META Y PROGRESOS         //
// ========================================== //

/**
 * Evalúa el progreso de la inversión actual versus la meta límite definida,
 * calculando el Daily Burn Rate necesario para consumir el presupuesto equitativamente
 * hasta la fecha estipulada.
 * 
 * @param {number} accumulatedSpend - Inversión acumulada al momento
 * @param {number} targetBudget - Presupuesto meta u objetivo (ej. $50,000)
 * @param {string|Date} targetDate - Fecha límite de la campaña (ej. "2026-06-30T23:59:59")
 * @returns {Object} Objeto con las proyecciones y porcentajes
 */
const checkBudgetProgress = (accumulatedSpend, targetBudget, targetDate) => {
  const currentDate = new Date(); // Toma la fecha actual del sistema
  const deadline = new Date(targetDate);
  
  // Diferencia en milisegundos
  const timeDiff = deadline.getTime() - currentDate.getTime();
  
  // Convertimos a días (redondeamos hacia arriba para considerar una fracción de día como un día operable)
  // Utilizamos max(0, val) para no tener días negativos si la fecha ya pasó
  const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
  
  const remainingBudget = Math.max(0, targetBudget - accumulatedSpend);
  
  // Daily Burn Rate: Cuánto deberíamos gastar cada día en promedio para terminar exactos en $50k
  const dailyBurnRateRequired = daysRemaining > 0 ? (remainingBudget / daysRemaining) : 0;
  
  // Porcentaje de progreso financiero
  const progressPercentage = (accumulatedSpend / targetBudget) * 100;
  
  return {
    accumulatedSpend,
    remainingBudget,
    targetBudget,
    daysRemaining,
    dailyBurnRateRequired,
    progressPercentage
  };
};

// ========================================== //
// 3. MOTOR PRINCIPAL DE ANÁLISIS & ALERTAS   //
// ========================================== //

/**
 * Procesa la base de datos de marketing para generar los KPIs globales, 
 * marcar alertas individuales si un día tuvo rendimiento ineficiente, 
 * y verificar el estatus del presupuesto global.
 * 
 * @param {Array<Object>} dataset - Array de objetos con datos de campaña
 * @param {number} totalBudget - Meta de presupuesto global
 * @param {string} deadlineString - Fecha límite de la campaña
 * @returns {Object} Struct de respuesta JSON con resumen macro y detalle micro
 */
const analyzeCampaignData = (dataset, totalBudget = 50000, deadlineString = '2026-06-30T23:59:59-05:00') => {
  let totalInversion = 0;
  let totalRegistros = 0;
  let totalFtds = 0;

  // Fase 1: Recopilar inversión y conversiones totales para promedios macro (históricos)
  dataset.forEach(row => {
    totalInversion += row.Inversión;
    totalRegistros += row.Registros;
    totalFtds += row.FTDs;
  });

  // Cálculo del Costo de Adquisición y Lead histórico del periodo evaluado
  const globalCPL = calculateCPL(totalInversion, totalRegistros);
  const globalCPA = calculateCPA(totalInversion, totalFtds);

  // Fase 2: Mapear el dataset aplicando Lógica de Alertas
  const analyzetDataset = dataset.map(row => {
    const dayCPL = calculateCPL(row.Inversión, row.Registros);
    const dayCPA = calculateCPA(row.Inversión, row.FTDs);

    // Lógica de Alerta requerida:
    // Si el CPA del día excede un 20% el promedio histórico (globalCPA), marcar como crítico.
    let status = "Saludable";
    const thresholdCPA = globalCPA * 1.20;

    if (globalCPA > 0 && dayCPA > thresholdCPA) {
      status = "Crítico (CPA Diario excedió >20% del promedio histórico)";
    }

    return {
      Fecha: row.Fecha,
      Inversión: row.Inversión,
      Registros: row.Registros,
      FTDs: row.FTDs,
      CPL: Number(dayCPL.toFixed(2)),
      CPA: Number(dayCPA.toFixed(2)),
      EstadoRendimiento: status
    };
  });

  // Fase 3: Evaluación presupuestal
  const budgetStatus = checkBudgetProgress(totalInversion, totalBudget, deadlineString);

  // Retorno formateado y limpio (Salida requerida en JSON object)
  return {
    ResumenGlobal: {
      "Inversión Total": Number(totalInversion.toFixed(2)),
      "Registros Totales": totalRegistros,
      "FTDs Totales": totalFtds,
      "CPL Global": Number(globalCPL.toFixed(2)),
      "CPA Global": Number(globalCPA.toFixed(2)),
      "% Progreso de Meta": Number(budgetStatus.progressPercentage.toFixed(2)),
      "Días Restantes (hasta Jun 2026)": budgetStatus.daysRemaining,
      "Presupuesto Restante": Number(budgetStatus.remainingBudget.toFixed(2)),
      "Daily Burn Rate Requerido": Number(budgetStatus.dailyBurnRateRequired.toFixed(2))
    },
    RegistrosDetallados: analyzetDataset
  };
};

// Exportación del módulo para usar en otras capas (Ej. Express / NestJS)
module.exports = {
  calculateCPL,
  calculateCPA,
  checkBudgetProgress,
  analyzeCampaignData
};

