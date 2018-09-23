function htmlentities(input) {
	return input.replace(/\&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function c(tagName) {
	return document.createElement(tagName);
}

function win(N) {
	return document.getElementById(N);
}

function n(e) {
	document.body.appendChild(e);
}

function startui() {
	window.dragging = false;
	window.resizing = false;
	window.windows = [];
	window.terminals = {};
	window.nwindows = 0;
	window.Nwindows = 0;

/*	var button = document.createElement('input');
	button.type = 'button';
	button.value = 'New';
	button.onclick = function () {
		document.body.appendChild(newWindow('' + window.Nwindows, true));
	}
	document.body.appendChild(button);*/

	document.onmousemove = function(event) {
		if (window.dragging != false) {
			var x = parseInt(window.dragging.style.left.replace('px', ''));
			var y = parseInt(window.dragging.style.top.replace('px', ''));
			var d;

			d = (event.screenX - window.dragging.x);
			x += d;
			window.dragging.x = event.screenX;

			d = (event.screenY - window.dragging.y);
			if ((y + d) < 0) {
				window.dragging = false;
				return;
			}
			y += d;
			window.dragging.y = event.screenY;

			window.dragging.style.top = y + 'px';
			window.dragging.style.left = x + 'px';
		} else if (window.resizing != false) {
			var dx = event.screenX - window.resizing.x;
			var dy = event.screenY - window.resizing.y;

			window.resizing.resizeDiv.style.width = (parseInt(window.resizing.resizeDiv.style.width.replace(/px$/, '')) + dx) + 'px';
			window.resizing.resizeDiv.style.height = (parseInt(window.resizing.resizeDiv.style.height.replace(/px$/, '')) + dy) + 'px';

			window.resizing.x = event.screenX;
			window.resizing.y = event.screenY;
		}
	}

	mkdir("/dev/hsys");
	mkfile("/dev/hsys/new", function(f, p) {
		f.window = newWindow('' + window.Nwindows, true);
		document.body.appendChild(f.window);
	},
	function(f, p) {
		var data = '';
		p.count = 0;
		if (p.offset == 0) {
			data = fromutf8(f.window.id);
			p.count = data.length;
		}
		respond(p, data);
	});
	
}

function newWindow(id, canclose) {
	var div = document.createElement('div');
	window.windows.push(div);
	window.nwindows++;
	window.Nwindows++;

	div.id = id;
	div.setAttribute('class', 'window');
	div.style.top = (window.nwindows * 10 + 10) + 'px';
	div.style.left = (window.nwindows * 10 + 10) + 'px';
	div.style.width = '640px';
	div.style.height = '480px';
	div.style.zIndex = window.nwindows;
	div.termhidden = false;

	div.bg = document.createElement('div');
	div.bg.setAttribute('class', 'bg');

	div.terminal = newTerminal();
	div.terminal.div = div;
	window.terminals[id] = div.terminal;

	div.titleBar = document.createElement('div');
	div.titleBar.div = div;
	div.titleBar.setAttribute('class', 'title');
	div.titleBar.innerHTML = '<span class="name">' + unescape(div.id) + '</span>';

	div.titleBar.onmousedown = function(event) {
		this.div.x = event.screenX;
		this.div.y = event.screenY;
		window.dragging = this.div;

		for (var i = 0; i < window.windows.length; i++)
			if (window.windows[i].style.zIndex > window.dragging.style.zIndex)
				window.windows[i].style.zIndex--;

		window.dragging.style.zIndex = window.nwindows;

		event.preventDefault();
		return false;
	}

	// avoid that trapping bug by using global not div.titleBar
	window.onmouseup = function(event) {
		window.dragging = false;

		if (window.resizing != false) {
			window.resizing.style.width = window.resizing.resizeDiv.style.width;
			window.resizing.style.height = window.resizing.resizeDiv.style.height;
			document.body.removeChild(window.resizing.resizeDiv);
			resizeCompute(window.resizing);
			window.resizing = false;
		}
	}

	var link = document.createElement('a');
	link.href = 'javascript:hideWindow(\'' + escape(id) + '\')';
	link.id = div.id + 'vis';

	var span = document.createElement('span');
	span.setAttribute('class', 'button');
	span.style.float = 'right';
	span.innerHTML = '<strong>&darr;</strong>';

	link.appendChild(span);
	div.titleBar.appendChild(link);

	if (canclose) {
		link = document.createElement('a');
		link.href = 'javascript:closeWindow(\'' + escape(id) + '\')';

		span = document.createElement('span');
		span.setAttribute('class', 'button');
		span.style.float = 'right';
		span.innerHTML = '<strong>x</strong>';

		link.appendChild(span);
		div.titleBar.appendChild(link);
	}

	div.resizeHandle = document.createElement('div');
	div.resizeHandle.div = div;
	div.resizeHandle.setAttribute('class', 'resizer');
	div.resizeHandle.onmousedown = function(event) {
		window.resizing = this.div;
		window.resizing.x = event.screenX;
		window.resizing.y = event.screenY;

		var rdiv = document.createElement('div');
		window.resizing.resizeDiv = rdiv;

		rdiv.div = this.div;
		rdiv.setAttribute('class', 'resizeBox');
		rdiv.style.zIndex = rdiv.div.style.zIndex + 1;
		rdiv.style.position = 'absolute';
		rdiv.style.width = window.resizing.style.width;
		rdiv.style.height = window.resizing.style.height;
		rdiv.style.top = window.resizing.style.top;
		rdiv.style.left = window.resizing.style.left;

		document.body.appendChild(rdiv);

		event.preventDefault();
		return false;
	}

	div.bottom = document.createElement('div');
	div.bottom.setAttribute('class', 'bottom');
	div.bottom.appendChild(div.resizeHandle);

	div.appendChild(div.terminal);
	div.appendChild(div.bg);
	div.appendChild(div.titleBar);
	div.appendChild(div.bottom);

	resizeCompute(div);

	mkdir("/dev/hsys/" + id);
	mkfile("/dev/hsys/" + id + "/cons", undefined, function(f, p) { document.getElementById(id).terminal.readterminal(p.count, function(l) {respond(p, l);}, p.tag); }, function(f, p) { document.getElementById(id).terminal.writeterminal(p.data); respond(p, -1); });
	mkfile("/dev/hsys/" + id + "/consctl", undefined, invalidop, function(f, p) { if(p.data.substr(0, 5) == "rawon") document.getElementById(id).terminal.rawmode = true; if(p.data.substr(0, 5) == "rawoff") document.getElementById(id).terminal.rawmode = false; respond(p, -1); }, function(f) { document.getElementById(id).terminal.rawmode = false; });
	mkfile("/dev/hsys/" + id + "/cpunote", undefined, function(f, p) { window.terminals[id].onnote.push(function(l) { respond(p, l);}); });
	mkfile("/dev/hsys/" + id + "/label", undefined, function(f, p) {
		var data = '';
		p.count = 0;
		if (p.offset == 0) {
			data = fromutf8(document.getElementById(id).titleBar.getElementsByClassName('name')[0].innerHTML);
			p.count = data.length;
		}
		respond(p, data);
	},
	function(f, p) {
		document.getElementById(id).titleBar.getElementsByClassName('name')[0].innerHTML = toutf8(p.data);
		respond(p, -1);
	});
	mkfile("/dev/hsys/" + id + "/winid", undefined,
		function(f, p) {
			var data = '';
			p.count = 0;
			if (p.offset == 0) {
				data = fromutf8('' + id);
				p.count = data.length;
			}
			respond(p, data);
		});

	return div;
}

function closeWindow(id) {
	var win = document.getElementById(id);

	if (win != null) {
		win.terminal.note("hangup");
	//	rmfile("/dev/hsys/" + id + "/*");
	//	rmfile("/dev/hsys/" + id);
		document.body.removeChild(win);
	}

	window.nwindows--;
}

function hideWindow(id) {
	var div = document.getElementById(id);
	var button = document.getElementById(id + 'vis');

	div.oldheight = div.style.height;
	div.style.height = '1.2em';
	div.terminal.style.display = 'none';
	div.bg.style.display = 'none';
	div.bottom.style.display = 'none';
	div.resizeHandle.style.display = 'none';
	button.getElementsByTagName('span')[0].innerHTML = '<strong>&uarr;</strong>';
	button.href = 'javascript:showWindow(\'' + escape(id) + '\');';
}

function showWindow(id) {
	var div = document.getElementById(id);
	var button = document.getElementById(id + 'vis');

	div.style.height = div.oldheight;
	if (div.termhidden == false)
		div.terminal.style.display = 'block';
	div.resizeHandle.style.display = 'block';
	div.bg.style.display = 'block';
	div.bottom.style.display = 'block';
	button.getElementsByTagName('span')[0].innerHTML = '<strong>&darr;</strong>';
	button.href = 'javascript:hideWindow(\'' + escape(id) + '\');';
}

function resizeCompute(div) {
	var width = div.style.width.replace(/px$/, '');
	var height = div.style.height.replace(/px$/, '');

	div.titleBar.style.width = width + 'px';
	div.terminal.style.width = width + 'px';
	div.terminal.style.height = (height - 30) + 'px';
	div.bg.style.height = (height - 30) + 'px';
}
