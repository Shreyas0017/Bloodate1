const { processReport } = require('./services/reportPipeline');
async function main() {
  const result = await processReport('cmpk16wks0005ypz1uwqwe3vu'); // the id of the failed report
  console.log(result);
}
main().catch(console.error);
