(function($){

	var $document = $(document);	// 获取document对象，主要是为了键盘事件的调用
	var $main = $("#main");		// 获取canvas节点对象
	var $next = $("#nextCom");		// 获取显示下一个组件的节点jquery对象
	var $score = $("#showScore");	// 获取显示分数的节点
	var $level = $("#showLevel");
	var col = 13;
	var row = 20;
	var boxArr;
	var offsetX = 5,	// 初始化偏移量
		offsetY = 0;
	var speed = 800;	// 设置下降的速度
	var timer = null;
	var score = 0;			// 记录总分数
	var level = 1;			// 记录当前等级
	var lineId = [];		// 记录消除的id序列号数组


	// 对块儿的绘制
	function Model(){
		this.item = 25;	// 单块的宽高
		// 变换后及相关的变换结构数据形式表达二位数组
		this.shap1=[[0,0,1,0,1,1,1,2],[0,1,1,1,2,1,2,0],[0,0,0,1,0,2,1,2],[0,0,1,0,2,0,0,1]];	// 反7（逆时针旋转）
        this.shap2=[[0,0,0,1,0,2,1,0],[0,0,1,0,2,0,2,1],[0,2,1,0,1,1,1,2],[0,0,0,1,1,1,2,1]];	// 正7（逆时针旋转）
        this.shap3=[[0,0,1,0,1,1,2,1],[1,0,1,1,0,1,0,2],[0,0,1,0,1,1,2,1],[1,0,1,1,0,1,0,2]];	// 正h（逆时针）
        this.shap4=[[0,1,1,0,1,1,2,0],[0,0,0,1,1,1,1,2],[0,1,1,0,1,1,2,0],[0,0,0,1,1,1,1,2]];	// 反h（逆时针）
        this.shap5=[[0,0,1,0,0,1,1,1],[0,0,1,0,0,1,1,1],[0,0,1,0,0,1,1,1],[0,0,1,0,0,1,1,1]];	// "田"
        this.shap6=[[0,1,1,1,2,1,1,0],[0,0,0,1,0,2,1,1],[0,0,1,0,2,0,1,1],[1,0,1,1,0,1,1,2]];	// "-|"（逆时针）
        this.shap7=[[0,0,1,0,2,0,3,0],[0,0,0,1,0,2,0,3],[0,0,1,0,2,0,3,0],[0,0,0,1,0,2,0,3]];	// "|"
        this.styles=[this.shap1,this.shap2,this.shap3,this.shap4,this.shap5,this.shap6,this.shap7];

        this.nextComPro = null;				//下一个组件的属性
		this.currentComPro = this.nextComponent();		// 当前这个组件的属性
	}

	// model层的原型方法函数
	Model.prototype = {
		// 初始化二位数组,为以后添加相应的值进行判断是否取消改行，或者已经与其他块儿接触。
		initTwoArr : function (){
			var arr = [];
			for (var i = 0; i < row; i++){		// 列
				var temarr = [];
				for(var j = 0; j < col; j++){		// 行
					temarr[j] = 0;
				}
				arr.push(temarr);
			}
			return arr;
		},
	// 生成随机样式颜色
		randomColor : function (){
			var arr = ["#00e427","#e4de00","#e40027","#9c13e4","#e46200","#004ee4","#00e4e4"];
			var rnum = Math.floor(arr.length * Math.random());
			return arr[rnum];
		},
		// 单个item单位块儿
		drawItem : function (ix, iy, color){
			$main.drawRect({
				strokeStyle: '#333',
		  		strokeWidth: 1,
		  		fillStyle: color,
				x: ix * this.item,
				y: iy * this.item,
				width:this.item - 2,
				height:this.item - 2,	// 减2 是因为存在两条边
				cornerRadius: 5,
				fromCenter: false
			});
		},

		// 根据传入的数组结构，画一个组件结构
		drawComponent : function () {
			var obj = this.currentComPro;
			for (var i = obj.arr.length - 1; i >= 0; i -= 2) {
				this.drawItem((offsetX + obj.arr[i]), (offsetY + obj.arr[i-1]), obj.color);
			}
		},
		// 清除主面板组件
		clearComponent : function(){
			var obj = this.currentComPro;
			for (var i = obj.arr.length - 1; i >= 0; i -= 2) {
				$main.clearCanvas({
					x: (offsetX + obj.arr[i]) * this.item -1,		// 按每个单元进行清除
					y: (offsetY + obj.arr[i-1]) * this.item -1,		// 减一是为了清除边界线，因为存在一个border的情况
					width: this.item,
					height: this.item,
					fromCenter: false
				});
			}
		},
		// 清除下一个组件的面板
		clearNextCom : function () {
			$next.clearCanvas({
				x : 0, y:0,
				width:150,
				height:150,
				fromCenter: false
			});
		},
		// 绘制当前组件
		currentComponent : function(){
			this.drawComponent();
		},
		// 随机生成下一个组件
		nextComponent : function(){
			var obj = {};
			obj.color = this.randomColor();
			var supnum = Math.floor(Math.random() * this.styles.length);
			var subnum = Math.floor(Math.random() * 4);
			obj.arr = this.styles[supnum][subnum];
			obj.shapId = supnum;		// 记录当前是那个形状的，并将该id存入obj中
			obj.innerShapId = subnum;	// 记录该形状中的变形后的形状。
			this.nextComPro = obj;
			return obj;
		},
		// 当触发按钮上键的时候，逆时针改变形状
		changeShap : function () {
			var flag = this.isChangeable();		// 判断到达底部的时候是否可以进行变形、
			var subch = this.isSubChangeable();	// 获取周围组件是否被影响，如果被影响返回一个false；

			var nextch = this.nextChangeable();
			if(!nextch){
				if(flag && subch){	// 同时具备了周围变换后的组件不受影响后，才可以进行形状的改变
					this.clearComponent();		// 清理变换前的组件
					var cs = this.currentComPro;
					if(cs.innerShapId == 3){
						cs.innerShapId = 0;
					} else {
						cs.innerShapId += 1;	// 内部形状id加一
					}
					cs.arr = this.styles[cs.shapId][cs.innerShapId];	// 更改该形状ID
					this.currentComponent();		// 重绘出变换后的组件
				}
			}
		},
		// 是否可以进行形状的改变（此处只是判断是否到底部可否放置）
		isChangeable : function(){		// 到达底部的时候检查是否图形可变，
			var csarr = this.currentComPro.arr;
			var range = Math.max.apply(null, csarr) + 1;
			// 当该图偏移最上的距离加上自己的最大高度如果大于了整个框体的高度的话，就必须清除变换事件的处理
			if (offsetY + range >= row){
				$document.off("keyup.up");		// 清除向上按钮事件的处理。
				return false;
			} else {
				return true;
			}
		},
		// 判断边框部分是否可以进行变换
		nextChangeable : function(){
			var nextshap = this.currentComPro.shapId;
			var nextshapid = this.currentComPro.innerShapId;
			var nextid;
			if(nextshapid == 3){
				nextid = 0;
			}else{
				nextid = nextshapid + 1;
			}
			var arr = this.styles[nextshap][nextid];
			var maxw = this.calcComWidth(arr);
			var flag = false;

			//alert(this.currentComPro.arr+"  "+this.styles[nextshap][nextid]+"  "+offsetX+"  "+ maxw +"  "+(offsetX + maxw > col));

			if(offsetX + maxw > col){	// 当下一个变化的最大宽度大于了整个布局的宽度的话，就返回false
				flag = true;
			}
			return flag;
		},
		// 当前图像的变换是否会影响其他的组件显示情况
		isSubChangeable : function(){
			var maxrange = Math.max(this.currentHeight(), this.currentWidth());
			var flag = true;
			for(var i = 0; i < maxrange; i++){
				for(var j = 0; j < maxrange; j++){
					if(boxArr[offsetY+i][offsetX+j]){
						flag = false;
						break;
					}
				}
			}
			return flag;
		},
		// 画下一个组件到next框中
		drawNextCom : function(){
			this.nextComPro = this.nextComponent();
			var obj = this.nextComPro;
			// 画下一个单位的ITEM
			for (var i = obj.arr.length - 1; i >= 0; i -= 2) {
				$next.drawRect({
					strokeStyle: '#333',
					strokeWidth: 1,
					fillStyle: obj.color,
					x: this.item * obj.arr[i]+25,
					y: this.item * obj.arr[i-1]+25,
					width: this.item - 1,
					height: this.item - 1,
					cornerRadius: 5,
					fromCenter: false
				});
			}
		},
		// 计算当前组件的高度
		currentHeight : function(){
			var arr = this.currentComPro.arr;
			var tem = [];
			tem.push(arr[0], arr[2], arr[4], arr[6]);
			tem.sort(function(first, second){
				return second - first;
			});
			return (tem[0] + 1);
		},
		// 计算当前组件的宽度
		currentWidth : function(){
			var arr = this.currentComPro.arr;
			var tem = [];
			tem.push(arr[1], arr[3], arr[5], arr[7]);
			tem.sort(function(first, second){
				return second - first;
			});
			return (tem[0] + 1);
		},
		// 计算组件的总宽度。
		calcComWidth : function(arr){
			var tem = [];
			tem.push(arr[1], arr[3], arr[5], arr[7]);
			return (Math.max.apply(null, tem) + 1);
		},
		// 将下一个组件变成当前这个组件
		turnNextToCurrent : function () {
			this.currentComPro = this.nextComPro;
			this.nextComPro = this.nextComponent();
			this.clearNextCom();
			offsetX = 5;		// 初始化原始值
			offsetY = 0;		// 初始化y轴的原始值
			this.initShow();	// 初始显示
		},
		// 清除行的操作；lineId为清除项的数组
		doClearLines : function(){
			var tem = [];
			for(var i=0; i<boxArr[0].length; i++){
				tem[i] = 0;
			}
			for(var j = 0; j < lineId.length; j++){
				boxArr.splice(lineId[j], 1);
				boxArr.unshift(tem);
			}
		},
		// 清除画布的所有显示item
		clearAllDraw : function(obj, w, h){
			obj.clearCanvas({
				x : 0, y : 0,
				width : w,
				height : h,
				fromCenter: false
			})
		},
		// 重绘全盘
		redraw : function(){
			var _color = this.randomColor();	// 随机剩下生成当前的元素
			this.clearAllDraw($main, 500, 500);		// 清除整个画板的元素块儿
			for(var i = 0; i < row; i++){
				for(var j =0; j < col; j++){
					if(boxArr[i][j] == 1){
						this.drawItem(j,i,_color);		// 此处需要注意填充位置
					}
				}
			}
		},
		// 初始化当前的显示状态
		initShow : function(){
			this.currentComponent();	// 绘制当前组件
			this.drawNextCom();		// 绘制下一个组件
		}
	};

	// 控制器
	function Controller(){
		this.model = new Model();
		this.tool = new Tool();
		this.effect = new Effect();
	}

	Controller.prototype = {
		// Controller总控制函数
		startGame : function(){
			boxArr = this.model.initTwoArr();
			var _this = this;
			this.showData();		// 显示基本信息

			_this.keyListener();	// 为添加事件
			_this.model.initShow();		// 初始化显示页面
			_this.autoFall();	// 自动添加自由下落
		},
		showData : function () {
			$score.html(score);
			$level.html(level);

			var str = this.tool.showLayout(boxArr);
			$("#showData").html(str);		// 测试数据显示
		},
		// 游戏结束
		gameOver : function(){
			alert("游戏结束！最终得分："+score);
			clearInterval(timer);
			$document.off("keyup");
			$document.off("keydown");
			this.model.clearAllDraw($main, 500, 500);
			this.model.clearAllDraw($next, 150, 150);		// 清除下一块儿面板元素块儿

			this.returnInit();		// 初始化初始数据
		},
		// 初始化初始数据
		returnInit : function () {
			score = 0;
			speed = 800;
			level = 1;
			offsetX = 5;
			offsetY = 0;
		},
		// 判断游戏是否结束
		isOver : function(){		// 游戏结束的时候只需要判断第一行是否有值，如果有则游戏结束
			var flag = false;
			for(var i = 0; i < col; i++){
				if(boxArr[0][i] == 1){
					flag = true;
				}
			}
			return flag;
		},
		// 下降
		autoFall : function(){
			var _this = this;
			timer = setInterval(function(){		// 定时移动
				if(_this.isMovable()){
					_this.model.clearComponent();	// 清除当前组件显示的位置
					offsetY += 1;		// 添加下降的高度
					_this.model.currentComponent();
					_this.isMovable();
				} else {
					_this.clearMove();
				}
			}, speed);
		},
		// 判断是否可以再次移动
		isMovable : function(){
			var model = this.model;
			var ch = model.currentHeight(),
				cw = model.currentWidth();
			if(offsetY + ch >= row || !this.isFallable()){	// 当方块儿到达到低端的时候
				return false;
			}
			return true;
		},
		// 清除运动
		clearMove : function () {
			var _this = this;
			clearInterval(timer);		// 清除自动下落的状态
			$document.off("keyup.up");
			$document.off("keydown.down");	// 通过事件命名的方式来区别上下按键与左右按键
			setTimeout(function(){		// 此处设置时间暂缓的目的是为了，当块儿到达最底部的时候有0.4秒的时间可以移动
				$document.off("keydown.xy");	// 清除键盘事件
				_this.record();		// 记录位置的改变，并记录设置相关值，以便以后清除检查及取消该项
				if(_this.isOver()){
					_this.gameOver();		// 游戏结束结束循环
					return false;
				}
				_this.clearLines();		// 判断是否可以进行清理处理
				_this.restart();		// 重启
			}, 200);
		},
		// 重启下一块儿组件，执行相关事件，
		restart : function(){
			this.model.turnNextToCurrent();		// 继续下一个组件的执行
			this.keyListener();
			this.autoFall();
		},
		// 单元点表格记录,单元点记录法
		record : function(){
			var model = this.model;
			var carr = model.currentComPro.arr;
			for(var i=0; i <carr.length; i += 2){
				boxArr[offsetY + carr[i]][offsetX + carr[i+1]] = 1;		// 为已经被占有的位置设置一个不为零的值
			}
			//  调试显示效果数据结构
			var str = this.tool.showLayout(boxArr);
			$("#showData").html(str);		// 测试数据显示
		},
		// 清除行，当填充完的时候，清除当前行
		clearable : function () {
			var flag = true;
			for(var i = 0; i < boxArr.length; i++){
				for(var j = 0; j < boxArr[0].length; j++){
					if(boxArr[i][j] == 0){
						flag = false;
						break;
					}else{
						flag = true;
					}
				}
				if(flag){
					lineId.push(i);
				}
			}
		},
		// 执行清除行操作
		clearLines : function () {
			var model = this.model;
			this.clearable();
			if(lineId.length > 0){
				model.doClearLines();		// 格式化布局数组的值
				model.redraw();		// 重绘全盘的数据结构表现样式
				score += lineId.length;		// 记录分数
				$score.html(score);
				lineId = [];		// 清空数据
			}
			this.turnLevel();
		},
		// 判断当前组件是否可以继续下落，原理是：根据当前组件下方是否为空位，如果不为空，及清除事件，停止组件的运动。
		isFallable : function () {
			var carr = this.model.currentComPro.arr;
			var flag = true;
			for(var i=0; i<carr.length; i+=2){
				var targetY = offsetY + carr[i] + 1;
				var targetX = offsetX + carr[i+1];
				if(boxArr[targetY][targetX]){
					flag = false;
					break;
				}
			}
			return flag;
		},
		// 最大偏移量
		maxOffsetY : function(){
			var carr = this.model.currentComPro.arr;
			for(var j = 1; j < row; j++){		// 死循环计算能偏移的最大量
				for(var i=0; i<carr.length; i+=2){
					var targetY = offsetY + carr[i] + j;
					var targetX = offsetX + carr[i+1];
					if(targetY-1 + this.model.currentHeight() == row -1 || boxArr[targetY][targetX])
						return offsetY + j - 1;
				}
			}
		},
		// 向左右移动
		moveX : function(val){
			if(val == 0) return;
			var model = this.model;
			var cw = model.currentWidth();
			this.model.clearComponent();		// 操作该组件前都得必须清理以前的再重新绘制
			offsetX += val;
			this.model.currentComponent();		// 重新绘制当前
		},
		// 向下移动加速下落
		moveDown : function(){
			this.model.clearComponent();
			offsetY += 1;
			this.model.currentComponent();

			if(this.maxOffsetY() == offsetY){
				$document.off("keydown.down");
			}
		},
		// 判断是否可以左右移动
		isLeftAndRight : function (val){
			var carr = this.model.currentComPro.arr;
			var flag = true;
			for(var i=0; i<carr.length; i+=2){
				var targetY = offsetY + carr[i];
				var targetL = offsetX + carr[i+1] + val;
				if(boxArr[targetY][targetL]){
					flag = false;
					break;
				}
			}
			return flag;
		},
		// 监听等级事件
		turnLevel : function () {
			if(score != 0 && (score % 30) == 0)	{
				level++;
				speed -= 100;
			}
		},
		// keypress 事件监听
		keyListener : function(){
			var _this = this;
			$document.on("keydown.xy", function(eve){
				var k = eve.which;
				switch (k) {
					case 37 :
						if(offsetX == 0 || !_this.isLeftAndRight(-1)){
							_this.moveX(0);
						} else {
							_this.moveX(-1);
						}
						break;
					case 39 :
						if((offsetX + _this.model.currentWidth()) == col || !_this.isLeftAndRight(1)){
							_this.moveX(0);
						} else {
							_this.moveX(1);
						}
						break;
				}
			});
			// 根据jquery事件定义的特点：可以个事件命名的， 这里把左右事件与上下事件进行分离处理，
			// 因为在块儿到底部的时候可以有一个时间进行左右移动，而此时到底部的时候，不能进行上下的再次操作，所以给予分离处理
			$document.on("keydown.down", function (eve) {
				var k = eve.which;
				if(k == 40){
					if(offsetY + _this.model.currentHeight() < row-1){
						_this.moveDown();
					}
				}
			});
			$document.on("keyup.up",function(eve){
				var k = eve.which;
				if(k == 38){
					_this.model.changeShap();
				}
			});
		}
	};
	// 工具函数
	function Tool(){}
	Tool.prototype = {
		// 将数组中的值进行单双分开，返回一个对象。对象中的arrEven返回双数的值数组。arrOdd返回计数的值数组
		arrSlice : function (arr){
			var obj = {
				arrEven : [],
				arrOdd : []
			};
			for(var i = 0; i < arr.length; i++){
				if(i % 2 == 0){
					obj.arrEven.push(arr[i]);
				}
				else {
					obj.arrOdd.push(arr[i]);
				}
			}
			return obj;
		},
		// 显示布局信息
		showLayout : function(arr){
			var str = "";
			for(var i = 0; i < row; i++){
				if(i < 9){
					str += "&nbsp;&nbsp;"+ (i+1) +":";
				}else {
					str += (i+1) +":";
				}
				for(var j=0; j< col; j++){
					str += arr[i][j] + " ";
				}
				str += "<br />";
			}
			return str;
		}

	};

	// 设置一些效果及相关背景
	function Effect(){
		// 给方块儿摆放区域加上背景图
		this.drawBackground = function(){
			$main.drawImage({
				source: 'image/bg.jpg',
				x: 0, y: 0,
				width: 325,
				height: 500,
				fromCenter: false
			});
		}
	}


	var draw = new Controller();
	draw.startGame();

})(jQuery);



/*
for(var i = 0; i < obj.arrOdd.length; i++){	// 奇数值循环，判断获取y轴偏移量的大小，boxArr[行(targetY)][列(targetX)]
	var targetY = offnextY + obj.arrOdd[i];		// 获取偏移量的下一个位置存储情况
	for(var j = 0; j < obj.arrEven.length; j++){	// 偶数遍历，
	var targetX = offsetX + obj.arrEven[i];		// 获取x轴的偏离量，此处不需要判断左右位置的偏离加一
	console.log(targetX, targetY);
	if(boxArr[targetY][targetX]){
		return false;
	} else {
		return true;
	}
	}

 var carr = this.model.currentComPro.arr;
 var obj = this.tool.arrSlice(carr);		// 总格子中的单位位置都初始化存储一个0，当有填充物的时候为1
 var flag = true;
 console.log(offsetY);
 for(var i = 0; i < 4; i++){
 var targetY = obj.arrOdd[i] + offsetY;
 var targetX = obj.arrEven[i] + offsetX;
 if(targetY < row){
 console.log("x："+targetY, "y：" + targetX, (boxArr[targetY][targetX] == 0));
 if(boxArr[targetY][targetX]){
 flag = false;
 break;
 }
 }
 }
 return flag;

}*/
	
