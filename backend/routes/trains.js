// routes/trains.js - IRCTC API Proxy via RapidAPI
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

// Helper to make RapidAPI calls
const rapidApiRequest = async (method, endpoint, params) => {
  const options = {
    method: method,
    url: `https://${process.env.RAPIDAPI_HOST}${endpoint}`,
    params: params,
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
    }
  };
  const response = await axios.request(options);
  return response.data;
};

/**
 * GET /api/trains/searchStation
 * Query: ?query=NDLS
 */
router.get('/searchStation', async (req, res) => {
  try {
    const data = await rapidApiRequest('GET', '/api/v1/searchStation', { query: req.query.query });
    res.json(data);
  } catch (error) {
    console.error('RapidAPI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to search stations' });
  }
});

/**
 * GET /api/trains/searchTrain
 * Query: ?query=12951
 */
router.get('/searchTrain', async (req, res) => {
  try {
    const data = await rapidApiRequest('GET', '/api/v1/searchTrain', { query: req.query.query });
    res.json(data);
  } catch (error) {
    console.error('RapidAPI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to search trains' });
  }
});

/**
 * GET /api/trains/betweenStations
 * Query: ?fromStationCode=NDLS&toStationCode=BCT&dateOfJourney=2024-12-01
 */
router.get('/betweenStations', async (req, res) => {
  try {
    const data = await rapidApiRequest('GET', '/api/v3/trainBetweenStations', {
      fromStationCode: req.query.fromStationCode,
      toStationCode: req.query.toStationCode,
      dateOfJourney: req.query.dateOfJourney
    });
    res.json(data);
  } catch (error) {
    console.error('RapidAPI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch trains between stations' });
  }
});

/**
 * GET /api/trains/schedule
 * Query: ?trainNo=12951
 */
router.get('/schedule', async (req, res) => {
  try {
    const data = await rapidApiRequest('GET', '/api/v1/getTrainSchedule', { trainNo: req.query.trainNo });
    res.json(data);
  } catch (error) {
    console.error('RapidAPI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get train schedule' });
  }
});

/**
 * GET /api/trains/seatAvailability
 * Query: ?classType=3A&fromStationCode=NDLS&quota=GN&toStationCode=BCT&trainNo=12951&date=2024-12-01
 */
router.get('/seatAvailability', async (req, res) => {
  try {
    const data = await rapidApiRequest('GET', '/api/v1/checkSeatAvailability', {
      classType: req.query.classType,
      fromStationCode: req.query.fromStationCode,
      quota: req.query.quota || 'GN',
      toStationCode: req.query.toStationCode,
      trainNo: req.query.trainNo,
      date: req.query.date
    });
    res.json(data);
  } catch (error) {
    console.error('RapidAPI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch seat availability' });
  }
});

/**
 * GET /api/trains/liveStation
 * Query: ?stationCode=NDLS&hours=1
 */
router.get('/liveStation', async (req, res) => {
  try {
    const data = await rapidApiRequest('GET', '/api/v3/getLiveStation', {
      stationCode: req.query.stationCode,
      hours: req.query.hours || 1
    });
    res.json(data);
  } catch (error) {
    console.error('RapidAPI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch live station data' });
  }
});

/**
 * GET /api/trains/liveStatus
 * Query: ?trainNo=12951&startDay=1
 */
router.get('/liveStatus', async (req, res) => {
  try {
    const data = await rapidApiRequest('GET', '/api/v1/getTrainLiveStatus', {
      trainNo: req.query.trainNo,
      startDay: req.query.startDay || 1
    });
    res.json(data);
  } catch (error) {
    console.error('RapidAPI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch live train status' });
  }
});

/**
 * GET /api/trains/pnr
 * Query: ?pnrNumber=1234567890
 */
router.get('/pnr', async (req, res) => {
  try {
    const data = await rapidApiRequest('GET', '/api/v3/getPNRStatus', { pnrNumber: req.query.pnrNumber });
    res.json(data);
  } catch (error) {
    console.error('RapidAPI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch PNR status' });
  }
});

module.exports = router;
