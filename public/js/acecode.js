var	SERVER,
	editJsCtrl,
	editJsCard,
	editHtmlCtrl,
	checkTimer;

function initEditor(editorId, mode, theme, strValue){
	//https://ace.c9.io/build/kitchen-sink.html
	// https://github.com/ajaxorg/ace/wiki/Configuring-Ace
element = document.getElementById(editorId);
if (element === null){ return;}
var edi = ace.edit(editorId);
	if (edi === undefined){
		return;
	}
	edi.$blockScrolling = Infinity;
	if (theme !== null){
		edi.setTheme("ace/theme/" + theme);
	}
	if (mode !== null){
		edi.getSession().setMode("ace/mode/" +  mode);
	}
	if (strValue !== undefined){
		edi.setValue(strValue);
	}
	return edi;
}
function initEditorText(editorId, strText){
	var ed = initEditor('editor-desc', null, null, strText);
	if (ed === undefined) {return;}
	ed.renderer.setOption('showGutter', false);
	ed.setOptions({
		highlightActiveLine	: false,
		showPrintMargin		: false
	});
}
function updateEditState(text, buttonID){
	if ( text === undefined || text === ""){
			console.log("disabling");
			$('#' + buttonID).prop('disabled', true);
		}
		else{
			updateSaveButtonState(buttonID);
		}
}

function aceInit(){
	editJsCtrl = initEditor(  'editor-js-ctrl',   'javascript', 'monokai');
	editJsCard = initEditor(  'editor-js-card',   'javascript', 'monokai');
	editHtmlCtrl = initEditor('editor-html-ctrl', 'html',       'chaos');
	var buttonID = 'btnSaveControl';

	$('#btnSaveControl').click(function() {
		var strCode = editJsCtrl.getValue();
		var strHtml = editHtmlCtrl.getValue();
		var strName = $('#name').val();
		var strDesc = $('#description').val();
		console.log("control name:");
		console.log(strName);
		console.log("control description:");
		console.log(strDesc);
		console.log("html template:");
		console.log(strHtml);
		console.log("Control class:");
		console.log(strCode);
		 var sendObj = {
			 name			: strName,
			 description	: strDesc,
			 template		: strHtml,
			  code			: strCode
		 };
		var posting = $.post( SERVER +'/controllers/register', sendObj);
		posting.done(function( data ) {
			console.log("posting done............");
			console.log(data);
		});
	});
	$('#btnSaveCard').click(function() {
		var strName = $('#name').val();
		var strDesc = $('#description').val();
		var strCard = editJsCard.getValue();
		console.log("card name:");
		console.log(strName);
		console.log("card description:");
		console.log(strDesc);
		console.log("card code:");
		console.log(strCard);
	});
	if (editJsCard !== undefined){
		buttonID = 'btnSaveCard';
	}
	
	//registering change events from user input
	$('#name')
		.keyup(function() {  updateEditState($.trim($(this).val()), buttonID);  })
		.change(function(){  updateEditState($.trim($(this).val()), buttonID);	});
	$('#description')
		.keyup(function() {  updateEditState($.trim($(this).val()), buttonID);	})
		.change(function(){  updateEditState($.trim($(this).val())), buttonID;	});
	
	if (editHtmlCtrl !== undefined){
		editHtmlCtrl.getSession().on('change', function() {
			updateEditState(editHtmlCtrl.getValue(), buttonID);
		});
		editHtmlCtrl.getSession().on('changeAnnotation', function() {
			updateEditState(editHtmlCtrl.getValue(), buttonID);
		});
	}

	if (editJsCtrl !== undefined){
		editJsCtrl.getSession().on('change', function() {
			updateEditState(editJsCtrl.getValue(), buttonID);
		});
		editJsCtrl.getSession().on('changeAnnotation', function() {
			updateEditState(editJsCtrl.getValue(), buttonID);
		});
	}
	if (editJsCard !== undefined){
		editJsCard.getSession().on('change', function() {
			updateEditState(editJsCard.getValue(), buttonID);
		});
		editJsCard.getSession().on('changeAnnotation', function() {
			updateEditState(editJsCard.getValue(), buttonID);
		});
	}
}

function isEditorTextValid(editor){
	if ($.trim(editor.getValue()) === ""){
		return false;
	}
	var arr = editor.getSession().getAnnotations();
	for(var i = 0; i < arr.length; i++){
		if (arr[i].type === 'error'){
			console.log("there are errors in the editor");
			return false;
		}
	}
	return true;
}

//enables the save button if all requered values are ok.
function updateSaveButtonState(buttonID){
	clearTimeout(checkTimer);
	checkTimer=setTimeout(function(){
		updateSaveButtonStateHelper(buttonID);
	}, 300);
}

function updateSaveButtonStateHelper(buttonID){
	
	console.log("updateSaveButtonStateHelper");
	var selectBtn = '#'+buttonID;
	if ($("#name").val() === ""){
			$(selectBtn).prop('disabled', true);  
			return;
	}
	if ($("#description").val() === ""){
			$(selectBtn).prop('disabled', true);  
			return;
	}
	
	if (editJsCard !== undefined){
		if (!isEditorTextValid(editJsCard)){	
			$(selectBtn).prop('disabled', true);  
			return;
		}
	}
	if (editJsCtrl !== undefined){
		if (!isEditorTextValid(editJsCtrl)){	
			$(selectBtn).prop('disabled', true);  
			return;
		}
	}
	if (editHtmlCtrl !== undefined){
		if (!isEditorTextValid(editHtmlCtrl)){	
			$(selectBtn).prop('disabled', true);  
			return;
		}
	}
	
	$(selectBtn).prop('disabled', false);
}
aceInit();//when script loads this runs.

$(function () {  
	/* this is the *$( document ).ready(function( $ ) but jshint does not like that*/
	SERVER = window.location.protocol+'//'+window.location.hostname+(window.location.port ? ':'+window.location.port: '');

});