/*
 * JavaScript Source 참고
 * 1. AWS 공식 : https://docs.aws.amazon.com/ko_kr/sdk-for-javascript/v2/developer-guide/s3-examples.html
 * 2. github : https://github.com/awsdocs/aws-doc-sdk-examples/blob/master/javascript/example_code/s3/s3_photoExample.js
 */
// snippet-start:[s3.JavaScript.photoAlbumExample.complete]
// snippet-start:[s3.JavaScript.photoAlbumExample.config]
var albumBucketName = "S3 Bucket 이름";
var bucketRegion = "해당 Bucket의 리전";
var IdentityPoolId = "자격 증명 풀의 IdentityPoolId";

/*
 * SDK 구성
 * Amazon Cognito 자격 증명 풀 ID를 제공하는 CognitoIdentityCredentials 메서드를
 * 호출하여 SDK를 구성하는데 필요한 자격 증명을 획득합니다.
 */
AWS.config.update({
	region: bucketRegion,
	credentials: new AWS.CognitoIdentityCredentials({
		IdentityPoolId: IdentityPoolId
	})
});

/**
 * <h3>SDK 구성</h3>
 * <p>다음에는, AWS.S3 서비스 객체를 생성합니다.
 */
var s3 = new AWS.S3({
	apiVersion: "2006-03-01",
	params: { Bucket: albumBucketName }
});
// snippet-end:[s3.JavaScript.photoAlbumExample.config]


/**
 * <h3>버킷에 있는 앨범 목록 표시</h3>
 * <p>이 애플리케이션은 Amazon S3 버킷의 앨범을 객체로 생성합니다.
 * 이 객체의 키는 객체 함수가 폴더임을 표시하는 '/' 문자로 시작합니다.
 * 버킷에 있는 모든 앨범의 목록을 표시하기 위해 애플리케이션의 listAlbums 함수는 commonPrefix를 사용하면서 AWS.S3 서비스 객체의 listObjects 메서드를 호출합니다.
 * 따라서 이 호출은 앨범으로 사용되는 객체만 반환합니다.</p>
 * <p>이 함수의 나머지 부분은 Amazon S3 버킷에서 앨범 목록을 가져오고 웹 페이지에 앨범 목록을 표시하는데 필요한 HTML을 생성합니다.
 * 또한 개별 앨범 삭제 및 열기도 활성화합니다.</p>
 */
// snippet-start:[s3.JavaScript.photoAlbumExample.listAlbums]
function listAlbums() {
	s3.listObjects({ Delimiter: "/" }, function(err, data) {
		if (err) {
			return alert("There was an error listing your albums: " + err.message);
		} else {
			var albums = data.CommonPrefixes.map(function(commonPrefix) {
				var prefix = commonPrefix.Prefix;
				var albumName = decodeURIComponent(prefix.replace("/", ""));
				return getHtml([
					"<li>",
					"<span onclick=\"deleteAlbum('" + albumName + "')\">X</span>",
					"<span onclick=\"viewAlbum('" + albumName + "')\">",
					albumName,
					"</span>",
					"</li>"
				]);
			});
			var message = albums.length
				? getHtml([
					"<p>Click on an album name to view it.</p>",
					"<p>Click on the X to delete the album.</p>"
				])
				: "<p>You do not have any albums. Please Create album.";
			var htmlTemplate = [
				"<h2>Albums</h2>",
				message,
				"<ul>",
				getHtml(albums),
				"</ul>",
				"<button onclick=\"createAlbum(prompt('Enter Album Name:'))\">",
				"Create New Album",
				"</button>"
			];
			document.getElementById("app").innerHTML = getHtml(htmlTemplate);
		}
	});
}
// snippet-end:[s3.JavaScript.photoAlbumExample.listAlbums]

/**
 * <h3>버킷에서 앨범 생성</h3>
 * <p>Amazon S3 버킷에서 앨범을 생성하기 위해 애플리케이션의 createAlbum 함수는 새 앨범에 지정된 이름을 확인하여 적합한 문자가 이름에 포함되는지 확인합니다.
 * 그런 다음 함수는 Amazon S3 객체 키를 구성하여 Amazon S3 서비스 객체의 headObject 메서드에 전달합니다.
 * 이 메서드는 지정된 키에 대한 메타데이터를 반환하므로, 데이터를 반환하는 경우 해당 키가 있는 객체가 이미 있는 것입니다.
 * <p>앨범이 아직 없는 경우 이 함수는 AWS.S3 서비스 객체의 putObject메서드를 호출하여 앨범을 생성합니다.
 * 그런 다음 viewAlbum 함수를 호출하여 비어 있는 새 앨범을 표시합니다.</p>
 */
// snippet-start:[s3.JavaScript.photoAlbumExample.createAlbum]
function createAlbum(albumName) {
	albumName = albumName.trim();
	if (!albumName) {
		return alert("Album names must contain at least one non-space character.");
	}
	if (albumName.indexOf("/") !== -1) {
		return alert("Album names cannot contain slashes.");
	}
	var albumKey = encodeURIComponent(albumName);
	s3.headObject({ Key: albumKey }, function(err, data) {
		if (!err) {
			return alert("Album already exists.");
		}
		if (err.code !== "NotFound") {
			return alert("There was an error creating your album: " + err.message);
		}
		s3.putObject({ Key: albumKey }, function(err, data) {
			if (err) {
				return alert("There was an error creating your album: " + err.message);
			}
			alert("Successfully created album.");
			viewAlbum(albumName);
		});
	});
}
// snippet-end:[s3.JavaScript.photoAlbumExample.createAlbum]

/**
 * <h3>앨범 보기</h3>
 * <p>Amazon S3 버킷에 앨범의 콘텐츠를 표시하기 위해 애플리케이션의 viewAlbum 함수는 앨범 이름을 가져오고 해당 앨범에 대한 Amazon S3 키를 생성합니다.
 * 그런 다음 이 함수는 AWS.S3 서비스 객체의 listObjects 메서드를 호출하여 앨범에 있는 모든 객체(사진)의 목록을 획득합니다.</p>
 * <p>이 함수의 나머지 부분은 앨범에서 객체(사진) 목록을 가져오고 웹 페이지에 사진을 표시하는 데 필요한 HTML을 생성합니다.
 * 또한 개별 사진을 삭제하고 앨범 목록으로 다시 이동하는 작업도 활성화합니다.</p>
 */
// snippet-start:[s3.JavaScript.photoAlbumExample.viewAlbum]
function viewAlbum(albumName) {
	var albumPhotosKey = encodeURIComponent(albumName) + "/";
	s3.listObjects({ Prefix: albumPhotosKey }, function(err, data) {
		if (err) {
			return alert("There was an error viewing your album: " + err.message);
		}
		// 'this' references the AWS.Response instance that represents the response
		var href = this.request.httpRequest.endpoint.href;
		var bucketUrl = href + albumBucketName + "/";

		var photos = data.Contents.map(function(photo) {
			var photoKey = photo.Key;
			var photoUrl = bucketUrl + encodeURIComponent(photoKey);
			return getHtml([
				"<span>",
				"<div>",
				'<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
				"</div>",
				"<div>",
				"<span onclick=\"deletePhoto('" +
				albumName +
				"','" +
				photoKey +
				"')\">",
				"X",
				"</span>",
				"<span>",
				photoKey.replace(albumPhotosKey, ""),
				"</span>",
				"</div>",
				"</span>"
			]);
		});
		var message = photos.length
			? "<p>Click on the X to delete the photo</p>"
			: "<p>You do not have any photos in this album. Please add photos.</p>";
		var htmlTemplate = [
			"<h2>",
			"Album: " + albumName,
			"</h2>",
			message,
			"<div>",
			getHtml(photos),
			"</div>",
			'<input id="photoupload" type="file" accept="image/*">',
			'<button id="addphoto" onclick="addPhoto(\'' + albumName + "')\">",
			"Add Photo",
			"</button>",
			'<button onclick="listAlbums()">',
			"Back To Albums",
			"</button>"
		];
		document.getElementById("app").innerHTML = getHtml(htmlTemplate);
	});
}
// snippet-end:[s3.JavaScript.photoAlbumExample.viewAlbum]

/**
 * <h3>앨범에 사진 추가</h3>
 * <p>Amazon S3 버킷의 앨범에 사진을 업로드하기 위해 애플리케이션의 addPhoto 함수는 웹 페이지에서 파일 선택기 요소를 사용하여 업로드할 파일을 식별합니다.
 * 그런 현재 앨범 이름과 파일 이름에서 업로드할 사진에 대한 키를 구성합니다.</p>
 * <p>이 함수는 Amazon S3 서비스 객체의 upload 메서드를 호출하여 사진을 업로드합니다.
 * ACL 파라미터는 public-read로 설정되므로 애플리케이션은 URL를 기준으로 버킷에 표시하기 위해 앨범의 사진을 가져올 수 있습니다.
 * 사진을 업로드한 후 이 함수는 업로드된 사진이 나타나도록 앨범을 다시 표시합니다.</p>
 */
// snippet-start:[s3.JavaScript.photoAlbumExample.addPhoto]
function addPhoto(albumName) {
	var files = document.getElementById("photoupload").files;
	if (!files.length) {
		return alert("Please choose a file to upload first.");
	}
	var file = files[0];
	var fileName = file.name;
	var albumPhotosKey = encodeURIComponent(albumName) + "/";

	var photoKey = albumPhotosKey + fileName;

	// Use S3 ManagedUpload class as it supports multipart uploads
	var upload = new AWS.S3.ManagedUpload({
		params: {
			Bucket: albumBucketName,
			Key: photoKey,
			Body: file,
			ACL: "public-read"
		}
	});

	var promise = upload.promise();

	promise.then(
		function(data) {
			alert("Successfully uploaded photo.");
			viewAlbum(albumName);
		},
		function(err) {
			return alert("There was an error uploading your photo: ", err.message);
		}
	);
}
// snippet-end:[s3.JavaScript.photoAlbumExample.addPhoto]

/**
 * <h3>사진 삭제</h3>
 * <p>Amazon S3 버킷의 앨범에서 사진을 삭제하기 위해 애플리케이션의 deletePhoto 함수는 Amazon S3 서비스 객체의 deleteObject 메서드를 호출합니다.
 * 이렇게 하면 함수에 전달된 photoKey 값으로 지정되는 사진이 삭제됩니다.</p>
 */
// snippet-start:[s3.JavaScript.photoAlbumExample.deletePhoto]
function deletePhoto(albumName, photoKey) {
	console.log(photoKey);
	s3.deleteObject({ Key: photoKey }, function(err, data) {
		if (err) {
			return alert("There was an error deleting your photo: ", err.message);
		}
		alert("Successfully deleted photo.");
		viewAlbum(albumName);
	});
}
// snippet-end:[s3.JavaScript.photoAlbumExample.deletePhoto]

/**
 * <h3>앨범 삭제</h3>
 * <p>Amazon S3 버킷에서 앨범을 삭제하기 위해 애플리케이션의 deleteAlbum 함수는 Amazon S3 서비스 객체의 deleteObjects 메서드를 호출합니다.</p>
 */
// snippet-start:[s3.JavaScript.photoAlbumExample.deleteAlbum]
function deleteAlbum(albumName) {
	var albumKey = encodeURIComponent(albumName) + "/";
	s3.listObjects({ Prefix: albumKey }, function(err, data) {
		if (err) {
			return alert("There was an error deleting your album: ", err.message);
		}
		var objects = data.Contents.map(function(object) {
			return { Key: object.Key };
		});
		s3.deleteObjects(
			{
				Delete: { Objects: objects, Quiet: true }
			},
			function(err, data) {
				if (err) {
					return alert("There was an error deleting your album: ", err.message);
				}
				alert("Successfully deleted album.");
				listAlbums();
			}
		);
	});
}
// snippet-end:[s3.JavaScript.photoAlbumExample.deleteAlbum]
// snippet-end:[s3.JavaScript.photoAlbumExample.complete]
