const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const youtube = google.youtube('v3');
const API_KEY = 'YOUR_YOUTUBE_API_KEY';  // Replace with your actual API key

app.use(bodyParser.json());

// Function to get all video IDs from a channel
async function getVideoIdsFromChannel(channelId) {
    let videoIds = [];
    let nextPageToken = '';
    
    try {
        // Fetch the first page of videos from the channel
        do {
            const response = await youtube.search.list({
                part: 'snippet',
                channelId: channelId,
                maxResults: 50,  // Fetch 50 videos at once
                pageToken: nextPageToken,
                key: API_KEY,
            });

            response.data.items.forEach(item => {
                videoIds.push(item.id.videoId);
            });

            nextPageToken = response.data.nextPageToken;
        } while (nextPageToken);
    } catch (error) {
        console.error('Error fetching video IDs:', error);
    }

    return videoIds;
}

// Function to fetch captions for a video
async function getCaptionsForVideo(videoId) {
    try {
        const captions = await youtube.captions.list({
            part: 'snippet',
            videoId: videoId,
            key: API_KEY,
        });

        if (captions.data.items.length === 0) {
            return '';
        }

        const captionId = captions.data.items[0].id;
        const captionData = await youtube.captions.download({
            id: captionId,
            tfmt: 'srt',  // Use SRT format
            key: API_KEY,
        });

        return captionData.data;
    } catch (error) {
        console.error('Error fetching captions:', error);
        return '';
    }
}

// Endpoint to search captions across all videos in a channel
app.post('/search-captions', async (req, res) => {
    const { channelId, searchTerm } = req.body;

    if (!channelId || !searchTerm) {
        return res.status(400).send('Channel ID and search term are required');
    }

    try {
        // Get all video IDs for the channel
        const videoIds = await getVideoIdsFromChannel(channelId);

        let matchingVideos = [];

        // Search captions for each video
        for (const videoId of videoIds) {
            const captions = await getCaptionsForVideo(videoId);

            if (captions && captions.includes(searchTerm)) {
                matchingVideos.push(videoId);
            }
        }

        return res.json({ matchingVideos });
    } catch (error) {
        console.error('Error during search:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});