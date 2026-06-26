export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.redcapApiUrl || !config.redcapApiToken) {
    return { configured: false, records: [] }
  }

  const params = new URLSearchParams({
    token: config.redcapApiToken,
    content: 'record',
    format: 'json',
    type: 'flat',
    rawOrLabel: 'label',
    exportCheckboxLabel: 'false',
    exportSurveyFields: 'false',
    exportDataAccessGroups: 'false',
    returnFormat: 'json',
    fields: 'record_id,study,collection_time,hep_vol,heparin_pbmc_live_count,heparin_pbmc_viability',
  })

  let rows: Array<Record<string, string>>
  try {
    rows = await $fetch<Array<Record<string, string>>>(config.redcapApiUrl, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  }
  catch (e: unknown) {
    const err = e as { data?: unknown; message?: string }
    console.error('[redcap-qc] fetch error:', e)
    console.error('[redcap-qc] REDCap response body:', JSON.stringify(err?.data))
    throw createError({ statusCode: 502, statusMessage: 'Failed to reach REDCap API' })
  }

  if (!Array.isArray(rows)) {
    console.error('[redcap-qc] unexpected response:', rows)
    throw createError({ statusCode: 502, statusMessage: 'Unexpected REDCap API response' })
  }

  const records = rows
    .filter(row => row.study && row.collection_time)
    .map((row) => {
      const hepVol = parseFloat(row.hep_vol)
      const liveCount = parseFloat(row.heparin_pbmc_live_count)
      const viability = parseFloat(row.heparin_pbmc_viability)

      const yieldVal = (!isNaN(hepVol) && !isNaN(liveCount) && hepVol > 0)
        ? Math.round((liveCount / hepVol) * 1000) / 1000
        : null

      return {
        study: row.study,
        collectionTime: row.collection_time,
        yield: yieldVal,
        viability: (!isNaN(viability) && viability > 0) ? viability : null,
      }
    })
    .filter(r => r.yield !== null || r.viability !== null)

  return { configured: true, records }
})
