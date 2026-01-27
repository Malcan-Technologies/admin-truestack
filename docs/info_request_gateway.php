<?php
	//Function
	function encryptBody($body, $api_key) {
		$ciphertext = 'MTIzNDU2Nzg5MDEy';
		$cipher = 'aes-256-cbc';
		
		if (in_array($cipher, openssl_get_cipher_methods()))
		{
			$ciphertext = openssl_encrypt($body, $cipher, $ciphertext.$api_key, OPENSSL_RAW_DATA, $ciphertext);
			return base64_encode($ciphertext);	
		}
		
		return false;
	}
	
	function decryptBody($body, $api_key) {
		$ciphertext = 'MTIzNDU2Nzg5MDEy';
		$cipher = 'aes-256-cbc';
		
		if (in_array($cipher, openssl_get_cipher_methods()))
		{
			$output = openssl_decrypt(base64_decode($body), $cipher, $ciphertext.$api_key, OPENSSL_RAW_DATA, $ciphertext);
			return $output;
		}
		
		return false;
	}
	
	function displayRequest($name_body, $request_body, $api_key_request) {
		
		$requestJSON = json_encode($request_body);
		
		$request64 = encryptBody($requestJSON, $api_key_request);
		
		$encryptRequest = [
			'data' => $request64,
			'api_key' => $api_key_request
		];
		
		$encryptJSON = json_encode($encryptRequest);
		
		echo 'Request '. $name_body .' JSON'.'<br>';
		
		echo $requestJSON.'<br>'.'<br>';
		
		echo 'Request '. $name_body .' Encrypted'.'<br>';
		
		echo $encryptJSON.'<br>'.'<br>';
		
	};
	
	function encryptRequest($request_body, $api_key_request) {
		$requestJSON = json_encode($request_body);
		
		$request64 = encryptBody($requestJSON, $api_key_request);
		
		$encryptRequest = [
			'data' => $request64,
			'api_key' => $api_key_request
		];
		
		$encryptJSON = json_encode($encryptRequest);
		
		echo 'Request '. $requestJSON .' JSON'.'<br>';
		
		echo $encryptJSON.'<br>'.'<br>';
		
		return $encryptJSON;
	}
	
	function decryptRequest($request_body, $api_key_request) {
		$requestJSON = json_decode($request_body, true);
		$requestData = $requestJSON['data'];
		
		$result = decryptBody($requestData, $api_key_request);
		
		echo 'Result '. $request_body .' JSON'.'<br>';
		
		echo $result.'<br>'.'<br>';
		
		return $result;
	}
	
	function sendRequest($requestData, $requestURL) {
		
		$ch = curl_init($requestURL);
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
		curl_setopt($ch, CURLOPT_POSTFIELDS, $requestData);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, [
				'Content-Type: application/json'
			]
		); 
		$resultJSON = curl_exec($ch);
		
		return $resultJSON;
	}
	
	//Variable Declaration	
	$platform = 'Web';
	$onboarding_id = 'your_onboarding_id';
	$api_key = 'your_api_key';
	$package_name = 'your_package_name';
	$username = 'your_username';
	$ref_id = 'your_generated_ref_id';
	$ref_id_get_status = $username . $ref_id;
	$response_url = 'https://staging.xendity.com/';
	$backend_url = 'https://staging.xendity.com/';
	$callback_mode = '0';
	$response_mode = '1';
	$mode = '1';
	$md5key = 'm4X12dM8GeYGYl1gLXO8PaZTERGG9bVt';
	$request_time = '2023-02-20 01:01:01';
	$gateway_signature = base64_encode(md5($api_key . $md5key . $package_name . $ref_id . $md5key . $request_time));
	$gateway_signature_get_status = base64_encode(md5($api_key . $md5key . $package_name . $ref_id_get_status . $md5key . $request_time));
	$document_number = '123456121234';
	$full_name = 'EXAMPLE NAME';
	$gateway_url = 'https://staging.ekyc.xendity.com/v1/gateway/create-transaction';
	
	//Gateway Create Transaction
	$gatewayCreateTransactionRequest = [
		'api_key' => $api_key,
		'package_name' => $package_name,
		'ref_id' => $ref_id,
		'document_name' => $full_name,
		'document_number' => $document_number,
		'platform' => $platform,
		'signature' => $gateway_signature,
		'response_url' => $response_url,
		'backend_url' => $backend_url,
		'callback_mode' => $callback_mode,
		'response_mode' => $response_mode,
		'request_time' => $request_time
	];
	
	//Gateway Get Status
	$gatewayGetStatusRequest = [
		'api_key' => $api_key,
		'package_name' => $package_name,
		'ref_id' => $ref_id_get_status,
		'onboarding_id' => $full_name,
		'platform' => $platform,
		'signature' => $gateway_signature_get_status,
		'request_time' => $request_time,
		'mode' => $mode
	];
	
	//Display Requests
	
	echo 'signature = ' . $api_key . $md5key . $package_name . $ref_id . $md5key . $request_time;
	
	echo '<br>';
	
	displayRequest('Create Transaction', $gatewayCreateTransactionRequest, $api_key);
	
	displayRequest('Get Status', $gatewayGetStatusRequest, $api_key);
	
	//To Send Request
	$gateway_request = encryptRequest($gatewayCreateTransactionRequest, $api_key);
	$result = sendRequest($gateway_request, $gateway_url); 
	$response = decryptRequest($result, $api_key);
	
	echo 'gateway request = ' . $gateway_request;
	
	echo '<br>';
	
	echo 'result = ' . $result;
	
	echo '<br>';
	
	echo 'response = ' . $response;
	
	echo '<br>';
	
?>