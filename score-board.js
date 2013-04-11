$(function(){
  var Board = Backbone.Model.extend({
    defaults: function(){
      return{
        _id: Boards.nextId(),
        name: "empty"
      }
    }
  });

  var Person = Backbone.Model.extend({
    defaults: function(){
      return{
        job: "empty",
        name: "empty",
        board_id: 1,
        score: 0
      };
    },

    addScore: function(){
      this.save({score: parseInt(this.get("score")) + 1});
    },

    reduceScore: function(){
      if((parseInt(this.get("score")) - 1) >= 0){
        this.save({score: parseInt(this.get("score")) - 1});
      }
    }
  });

  var BoardList = Backbone.Collection.extend({
    model: Board,
    localStorage: new Backbone.LocalStorage("vote-backbone-board"),

    nextId: function(){
      if (!this.length) return 1;
      return this.last().get('_id') + 1;
    },

    comparator: '_id'
  });

  var Boards = new BoardList;

  var PersonList = Backbone.Collection.extend({
    model: Person,
    localStorage: new Backbone.LocalStorage("vote-backbone-person")
  });

  var People = new PersonList;

  var PersonView = Backbone.View.extend({
    tagName: 'div class="board span4"',

    template: _.template($('#person-template').html()),

    events: {
      "click .btn": "changeScore",
      "dblclick .view-job": "editJob",
      "dblclick .view-name": "editName",
    },

    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
      // this.listenTo(this.model, 'destroy', this.remove);
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.job_input = this.$('.edit-job');
      this.name_input = this.$('.edit-name');
      return this;
    },

    changeScore: function(e){
      if(parseInt($(e.target).attr('data-mark')) == 1){
        this.model.addScore();
      }else{
        this.model.reduceScore();
      }
      $(this.el).find('.score').text(this.model.get('score'));
    },
    editJob: function(){
      this.$el.addClass("editing-job");
      this.job_input.focus();
    },

    editName: function(){
      this.$el.addClass("editing-name");
      this.job_input.focus();
    }
  });


var BoardView = Backbone.View.extend({

  template: _.template($('#board-template').html()),

  tab_template: _.template($('#board-tab-template').html()),

  initialize: function(){
    this.listenTo(this.model, 'change', this.render);
    // this.listenTo(this.model, 'destory', this.remove);
    this.tab_view = undefined;
  },

  render: function(){
    this.setElement(this.template(this.model.toJSON()));
    var json = this.model.toJSON();
    json['first_letter'] = json.name.charAt(0);
    this.tab_view = this.tab_template(json);
    return this;
  }
});

var AppView = Backbone.View.extend({
  el: 'body',

  events: {
    "click #toolbar": "PopUpToolbar",
    "click #tab-list a": "changeTab",
    "click #confirm_add_board": "addNewBoard",
    "click #confirm_add_person": "addNewPerson"
  },

  initialize: function(){
    this.listenTo(Boards, 'add', this.addOneBoard);
    this.listenTo(Boards, 'reset', this.addAllBoard);
    this.listenTo(Boards, 'all', this.render);
    this.listenTo(People, 'add', this.addOnePerson);
    this.listenTo(People, 'reset', this.addAllPerson);
    this.listenTo(People, 'all', this.render);
    this.board = $("#score-boards");
    this.tab_list = $("#tab-list");

    Boards.fetch();
    People.fetch();
    console.log(Boards.toJSON());
    console.log(People.toJSON());
  },

  render: function(){
    this.fix_css();
    this.board.show();
    this.tab_list.show();
    this.activeTab();
    this.set_css();
    this.tab_list.find('li').off().siblings().hover(this.showTitle, this.hideTitle);
    this.setBoardSelect();
    return this;
  },

  addOneBoard: function(board) {
    var view = new BoardView({model: board});
    this.board.append(view.render().el);
    this.tab_list.append(view.render().tab_view);
  },

  addOnePerson: function(person) {
    var view = new PersonView({model: person});
    var board_id = person.get('board_id');
    this.$el.find("#score-board-" + board_id).append(view.render().el);
  },

  addAllBoard: function(){
    Boards.each(this.addOneBoard, this);
  },

  addAllPerson: function(){
    People.each(this.addOnePerson, this);
  },

  PopUpToolbar: function(e){
    e.preventDefault();
    target = this.$("#toolbar");
    ele = this.$("#toolbar-content")
    if(target.hasClass('shown')) {
      target.removeClass('shown')
      ele.animate({'opacity': 0, 'top': '-=10'}, 200, function(){
        ele.hide();
      });
    } else {
      coordinates = target.offset();
      left_css = coordinates.left - ele.width() / 2 - target.width() - 10;
      top_css = coordinates.top + target.height() + ele.height() / 2;
      ele.css("position", 'absolute');
      ele.css("left", left_css);
      ele.css("top", top_css);
      target.addClass("shown");
      ele.show().animate({'opacity': 1, 'top': '+=5'}, 200 );
    }
  },

  set_css: function(){
    this.tab_list.children().each(function(){
      var title = $(this).find('p').text();
      var _width = title.length * 30 + 46;
      $(this).find('p').css("width", _width).css('left', -_width).css("height", $(this).height());
    });
  },

  showTitle: function(){
    $(this).find('p').css('left', 0);
  },

  hideTitle: function(){
    $(this).find('p').css('left', -$(this).find('p').width());
  },

  activeTab: function(){
    var tab_id = window.location.hash;
    if(tab_id != ""){
      reg = new RegExp("[0-9]+", "g");
      tab_id = parseInt(reg.exec(tab_id)[0]) - 1;
    }else{
      tab_id = 0;
    }
    this.$el.find("#tab-list li").eq(tab_id).addClass('active').siblings().removeClass('active');
    this.$el.find("#score-board-" + (tab_id + 1)).show().siblings().hide();
  },

  setBoardSelect: function(){
    $('select').html("");
    Boards.each(function(board){$('select').append("<option value='" + board.get('_id') + "'>" + board.get('name') + "</option>")});
  },

  changeTab: function(e){
    e.preventDefault();
    var target = $(e.currentTarget);
    var parent = target.parent();
    var current_index = parent.prevAll().length + 1;
    window.location.hash = '#board_'+ current_index;
    console.log(window.location.hash);
    $(parent).addClass('active').siblings().removeClass('active');
    this.$el.find("#score-board-" + current_index).show().siblings().hide();
  },

  addNewBoard: function(e){
    this.$('#addBoard').modal('hide');
    var board_name_set = this.$("#boardName").val().replace(/，/ig,',').split(',');
    for(var i=0; i < board_name_set.length; i++){
      Boards.create({name:board_name_set[i], _id:Boards.nextId()});
    }
  },

  addNewPerson: function(e){
    this.$('#addPerson').modal('hide');
    var board_to_add = this.$("#boardToAdd").val();
    var origin_text = this.$("#personName").val().split('\n');
    for(var i=0;i < origin_text.length; i++){
      job_name_text = origin_text[i].split(' ');
      People.create({job:job_name_text[0],
       name: _.isEmpty(job_name_text[1])?"\u672A\u8BBE\u5B9A": job_name_text[1],
       board_id: board_to_add
     });
    }
  },

  fix_css: function(){
    this.$('div[id^=score-board-]').each(function(index, ele){
      count = $(ele).find('div.board').length
      var margin_left = 0;
      for(var i=1;i<=count;i++){
        $(ele).find('div.board').eq(i-1).css("margin-left", margin_left + "px");
        if(i%3 == 0){ margin_left = 0; }else{ margin_left = 20; }
      }
    });
  }
});

var App = new AppView;

});