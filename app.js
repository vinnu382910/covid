const express = require('express')
const app = express()
app.use(express.json())

const path = require('path')
const dbPath = path.join(__dirname, 'covid19India.db') //dbPath is given as arguument to filename in open() obect which connects database and server

const {open} = require('sqlite') //{open} method connect database server and provieds connection object to operate database
const sqlite3 = require('sqlite3')

let db = null //********************************************************//

const initializeDBAndServer = async () => {
  try {
    db = await open({
      //on resolve promise object , we will get database connection object, db is used to store this obj
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server is running at http://localhost:3000')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

//1.Get all states in state tables

const convertDbObjToResposeObj = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

app.get('/states/', async (request, response) => {
  const getAllStatesQuery = `SELECT * FROM  state;`
  const statesArray = await db.all(getAllStatesQuery) //all() is used to get all ojects in data present in state tables
  response.send(
    statesArray.map(eachState => convertDbObjToResposeObj(eachState)),
  )
})

//2. Get a state by state_id

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `SELECT * FROM state WHERE state_id = ${stateId};`
  const stateById = await db.get(getStateQuery)
  response.send(convertDbObjToResposeObj(stateById))
})

//3. Post a district in district table

app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const addDistrictQuery = `
  INSERT INTO district (district_name, state_id, cases, cured, active, deaths) 
  VALUES ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`
  await db.run(addDistrictQuery)
  response.send('District Successfully Added')
})

//4. Get a district by district_id

const convertDistObjToResObj = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

app.get('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `SELECT * FROM district WHERE district_id = ${districtId};`
  const districtArray = await db.get(getDistrictQuery)
  response.send(convertDistObjToResObj(districtArray))
})

//5. Deletes a district from the district table based on the district ID

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistQuery = `DELETE FROM district WHERE district_id = ${districtId};`
  await db.run(deleteDistQuery)
  response.send('District Removed')
})

//6. put the details of a specific district based on the district ID

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtdetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtdetails
  const updateQuery = `
            UPDATE district 
            SET 
                district_name='${districtName}',
                state_id=${stateId},
                cases=${cases},
                cured=${cured},
                active=${active},
                deaths=${deaths}
            WHERE district_id=${districtId};`
  await db.run(updateQuery)
  response.send('District Details Updated')
})

//7. Get the statistics of total cases, cured, active, deaths of a specific state based on state ID

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStatQuery = `
    SELECT 
      SUM(cases),
      SUM(cured),
      SUM(active),
       SUM(deaths)
    FROM 
      district
    WHERE 
      state_id = ${stateId};`

  const stats = await db.get(getStatQuery)
  console.log(stats)
  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

//8. Get an object containing the state name of a district based on the district ID

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getStateIdQuery = `SELECT state_id FROM district WHERE district_id = ${districtId}`
  const stateId = await db.get(getStateIdQuery)
  console.log(stateId)
  const getStateNameQuery = `SELECT state_name FROM state WHERE state_id = ${stateId.state_id};`
  const stateName = await db.get(getStateNameQuery)
  response.send({
    stateName: stateName.state_name,
  })
})

module.exports = app
