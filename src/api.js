const fetch = require('node-fetch');
const config = require('./config.json');
const { log } = require('./utility.js');

async function itemUpdate(itemID, columnID, value) {
    log.debug(`Attempting to update item: ${itemID}`);
    const query = {
        query: `mutation { change_column_value(board_id: ${config.monday.board_id}, item_id: ${itemID}, column_id: "${columnID}", value: "${value}") { id name column_values { id text value } } }`
    };
    try {
        const response = await fetch('https://api.monday.com/v2', {
            method: 'POST',
            headers: {
                'Authorization': config.monday.api_key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(query)
        });
        const data = await response.json();
        log.debug('Update response:', data);
        return data;
    } catch (err) {
        log.error('Error updating item:', err);
        throw err;
    }
}

// Example usage
itemUpdate(10692306914, 'numeric_mky9jr94', 349839.35);