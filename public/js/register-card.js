

function initCard(){
	$('#btnUserAccessCard').click(function() {
		var card    = $( '#item' ).data('card');
		if (card !== undefined && card.id !== undefined){
			window.location.href = '/cards/useraccess/'+ card.id;
		}
	});
}

$(function () {  
	initAce();
	initCard();
});