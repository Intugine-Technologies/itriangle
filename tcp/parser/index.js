const splitPacketandGet = (packetString) => {
	let packets = packetString.split(`\n`);
	let parsedPackets = packets.filter(packet => packet).map(packet => getParsedObject(packet));
	return parsedPackets;
};
const decodeMessageCode = (messageCode) => {
	let event = ``,
		stored = false;
	messageCode = parseInt(messageCode);
	if (messageCode > 100) {
		messageCode -= 100;
		stored = true;
	}

	switch (messageCode) {
		case 1:
			event = `default`;
			break;
		case 3:
			event = `power_fail`;
			break;
		case 4:
			event = `din1_high`;
			break;
		case 5:
			event = `din1_low`;
			break;
		case 8:
			event = `overspeed_start`;
			break;
		case 9:
			event = `overspeed_end`;
			break;
		case 10:
			event = `ignition_on`;
			break;
		case 11:
			event = `ignition_off`;
			break;
		case 12:
			event = `harsh_breaking`;
			break;
		case 13:
			event = `low_battery`;
			break;
		case 15:
			event = `info`;
			break;
		case 17:
			event = `harsh_acceleration`;
			break;
		case 19:
			event = `angle_polling`;
			break;


	}

	return `${event}${stored ? `_stored` : ``}`;

}

const calculateChecksum = (packet) => {
	let checksumDataString = packet.match(/.*\*/)[0].replace(/(\,|\*)/g, '');
	let checksum = parseInt('0', 16)
	checksumDataString.split('').forEach((c) => {
		checksum ^= c.charCodeAt(0);
	});

	return checksum.toString(16);
};


const getParsedObject = (packetString) => {
	let checksum = calculateChecksum(packetString);
	packetString = packetString.replace(/(\n|\r)/g, '');
	let params = packetString.split(',');
	let packetFormat = null;
	if (params.length <= 18) packetFormat = 'first';
	else if (params.length > 50) packetFormat = 'expanded';
	else packetFormat = 'compressed';
	console.log(`PACKET RECEIVED, PARAMS:`, params, `PARAM LENGTH: ${params.length}`);

	let returnObj = null;
	switch (packetFormat) {

		//parsing first packet
		case 'first':
			returnObj = {
				client_id: params[0].replace('$$', ''),
				ref: params[1],
				message_code: parseInt(params[2]),
				event: decodeMessageCode(params[2]),
				firmware_version: params[3],
				reporting_ip: params[4],
				reporting_port: params[5],
				apn: params[6],
				ignition_on_pingrate: params[7].replace('T1:', ''),
				ignition_off_pingrate: params[8].replace('T2:', ''),
				admin_number_1: params[9].replace('Ad1:', ''),
				admin_number_2: params[10].replace('Ad2:', ''),
				time_format: params[11].match(/19800/) ? "IST" : "GMT",
				overspeed_limit: params[13].match(/\d+/) ? params[13].match(/\d+/)[0] : null,
				overspeed_duration: params[14].match(/\d.*$/) ? params[14].match(/\d.*$/)[0] : null,
				GNSS_fix: params[15].replace('GPS:', '') === 'YES' ? true : false,
				ignition: params[16].replace('Ignition:', '') === 'ON' ? true : false,
				checksum: params[17].replace('*', '')
			};
			break;


			//parsing expanded packet format
		case 'expanded':
			//the following is used to store the first two digits of the year, as only a 2-digit year is received from the packet. 
			//In the event that this is still being run in the 22nd century, this code will have a better chance of parsing the time correctly
			let century = (new Date()).toISOString().slice(0, 2);
			let timeArray = params[5].match(/\d{2}/g);
			let packetTime = new Date((new Date(`${century}${timeArray[0]}-${timeArray[1]}-${timeArray[2]}T${timeArray[3]}:${timeArray[4]}:${timeArray[5]}.000Z`)).valueOf() - 330 * 60 * 1000);

			returnObj = {
				client_id: params[0].replace('$$', ''),
				ref: params[1],
				message_code: parseInt(params[2]),
				event: decodeMessageCode(params[2]),
				gps: [parseFloat(params[3]), parseFloat(params[4])],
				time: packetTime,
				GNSS_fix: params[6] === 'A' ? true : false,
				gsmStrength: params[7],
				speed: parseInt(params[8]),
				dbInstance_accumulated: parseInt(params[9]),
				course: parseInt(params[10]),
				satellites: parseInt(params[11]),
				hdop: parseFloat(params[12]),
				voltage: parseInt(params[15]),
				DIN1: params[16] === '1' ? true : false,
				case_open_switch: params[17] === '1' ? true : false,
				overspeed_start: params[18] === '1' ? true : false,
				overspeed_end: params[19] === '1' ? true : false,
				immobilizer_violation_alert: params[22] === '1' ? true : false,
				main_power_disconnect: params[23] === '1' ? true : false,
				ignition: params[27] === '1' ? true : false,
				internal_battery_low: params[34] === '1' ? true : false,
				angle_polling: params[35] === '1' ? true : false,
				digital_output: params[40] === '1' ? true : false,
				harsh_acceleration: params[42] === '1' ? true : false,
				harsh_breaking: params[43] === '1' ? true : false,
				external_battery_voltage: parseInt(params[48]),
				internal_battery_voltage: parseInt(params[49]),
				checksum: params[50].replace('*', '')
			};
			break;

		case 'compressed':
			returnObj = {};
			break;
		default:
			break;
	}
	returnObj.checksum_verified = returnObj.checksum === checksum ? true : false;
	return returnObj;
};


module.exports = splitPacketandGet;