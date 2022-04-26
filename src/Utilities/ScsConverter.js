let pairDictionary;
let temporaryNames;
let xmlDoc;
let nodeCounter = 0;

export function convertGwfToScs(content){
  let parser = new DOMParser();
  xmlDoc = parser.parseFromString(content, "text/xml");
  let childNode = xmlDoc.childNodes[0];

  resultStat = ""
  pairDictionary = getPairDictionary();
  temporaryNames = new Map();
  getTempChildren(childNode);

  let translatedDoc = {
    statement: ""
  };
  getChildren(childNode, translatedDoc);
  return resultStat
}

function getTempChildren(elem) {

  for (let i in elem.childNodes) {
    if (elem.childNodes[i].nodeType === 1) {

      if (elem.childNodes[i].hasAttribute("type")) {
          if (elem.childNodes[i].tagName == "node" && elem.childNodes[i].getAttribute("idtf") == "") {
              temporaryNames.set(elem.childNodes[i].getAttribute("id"), "temp_sc_node"+nodeCounter);
              nodeCounter += 1;
            }
      }
        
      getTempChildren(elem.childNodes[i]);
    }
  }
}

function getChildren(elem, translatedDoc) {

    for (let i in elem.childNodes) {
      if (elem.childNodes[i].nodeType === 1) {
          //если дуга, то проверяем идет она в дугу или в узел
          if (elem.childNodes[i].tagName === "arc" || elem.childNodes[i].tagName === "pair") {
            let statement = {
              firstEl: null, //элемент от которого идет дуга
              pair: null, //дуга
              secondEl: null //элемент к которому идет дуга
            }
            createStatement (elem.childNodes[i], statement);

            if (Array.isArray(statement.firstEl)) { //преобразуем массив строк в массив выражений
              statement.firstEl = getStatementArray (statement.firstEl, statement.pair, statement.secondEl, true); 
              
            }

            if (Array.isArray(statement.secondEl)) { //преобразуем массив строк в массив выражений
              statement.secondEl = getStatementArray (statement.firstEl, statement.pair, statement.secondEl, false); 
              
            }
        
            let st = getTranslated(statement, false);
            console.log(st);
          }

        getChildren(elem.childNodes[i], translatedDoc);
      }
    }
}

function getStatementArray (firstEl, pair, secondEl, isFirst) {
  let resStatArray = [];
  let array = isFirst ? firstEl : secondEl;
  for (let el in array) {

    if (isFirst) {
      let tempStatement = {
        firstEl: array[el], //элемент от которого идет дуга
        pair: pair, //дуга
        secondEl: secondEl //элемент к которому идет дуга
      };
    resStatArray.push(tempStatement);

    } else {
      let tempStatement = {
        firstEl: firstEl, //элемент от которого идет дуга
        pair: pair, //дуга
        secondEl: array[el] //элемент к которому идет дуга
      };
    resStatArray.push(tempStatement);

    }
  
  }   
  return resStatArray;     
}

//флаг, говорит о том вложенное ли выражение, если вложенное ;;\n будут отсутствовать
function getTranslated (statement, isInside) {
  let isTranslated = false; //флаг, говорящий о том, что вторая дуга уже была переведена
  let resultStatement = "";

  if (isInside) {
    resultStatement += "(";
  }

  if (Array.isArray(statement.firstEl)) { //если первый элемент - список выражений

    let statements = [];
    for (let el in statement.firstEl) {
      //для каждого вызываем эту же функцию

      let arrayStat = {
        firstEl: statement.firstEl[el], //элемент от которого идет дуга
        pair: statement.pair, //дуга
        secondEl: statement.secondEl //элемент к которому идет дуга
      }

      statements.push(getTranslated (arrayStat, isInside));

    }
  } else if (typeof (statement.firstEl) == "object") {

    let subStatement = getTranslated (statement.firstEl, true);
    resultStatement += subStatement + " " + statement.pair + " ";

  } else {
    resultStatement += statement.firstEl+" "+statement.pair+" ";
  }

  if (Array.isArray(statement.secondEl)) { //если второй элемент - список выражений

    let isFirst = true;
    for (let el in statement.secondEl) {

      let arrayStat = {
        firstEl: statement.firstEl, //элемент от которого идет дуга
        pair: statement.pair, //дуга
        secondEl: statement.secondEl[el] //элемент к которому идет дуга
      }

      if (isFirst) {
        resultStatement += statement.secondEl[el]+";;\n"
        isFirst = false;
      } else {
        resultStatement += getTranslated (arrayStat, isInside);
      }
    }

  } else if (typeof (statement.secondEl) == "object") {

    let subStatement = getTranslated (statement.secondEl, true);
    resultStatement += subStatement;

  } else if (!isTranslated){
    resultStatement += statement.secondEl;
  }
  if (!isInside) {
    resultStatement += ";;\n";
  } else {
    resultStatement += ")";
  }
  return resultStatement;
}

//для каждой найденной дуги будет определяться свое выражение
function createStatement (elem, statement) {
  let begElementInfo = {
    idToFind: elem.getAttribute("id_b"),  //идентификатор по которому будем искать начальный элемент
    foundEl: null, //элемент, который найдется
    type: null, //тип элемента (узел, дуга, шина, контур)
    isBegin: true //флаг, определяющий: элемент начальный или конечный
  };

  let translatedPair = pairDictionary.get(elem.getAttribute("type"));
  statement.pair = translatedPair;

  let endElementInfo = {
    idToFind: elem.getAttribute("id_e"),  //идентификатор по которому будем искать конечный элемент
    foundEl: null, //элемент, который найдется
    type: null, //тип элемента (узел, дуга, шина, контур)
    isBegin: false //флаг, определяющий: элемент начальный или конечный
  };

  //находим элементы
  findElement(xmlDoc, begElementInfo);
  findElement(xmlDoc, endElementInfo);

  //определяем тип элементов, которые уже нашли
  defineElementType (begElementInfo);
  defineElementType (endElementInfo);

  //заполняем statement
  defineStatement(begElementInfo, statement);
  defineStatement(endElementInfo, statement);
  
}

function defineStatement (elementInfo, statement) {
  switch (elementInfo.type) {
    case 'node': //если узел, то в statement идет аттрибут "idtf" или _ (в случае пустого идентификатора)
    
    let attributeIdtf = elementInfo.foundEl.getAttribute('idtf');

    if (elementInfo.isBegin) {
        if (attributeIdtf != '') {
          statement.firstEl = attributeIdtf;
        } else {
          statement.firstEl = temporaryNames.get(elementInfo.foundEl.getAttribute('id'));
        }
       
      } else {
          if (attributeIdtf != '') {
              statement.secondEl = attributeIdtf;
          } else {
              statement.secondEl = temporaryNames.get(elementInfo.foundEl.getAttribute('id'));
          }
      }
      break;

    case 'file': //если файл, то в statement идет аттрибут "file_name" дочернего узла номер 1

    let attributeFileName = elementInfo.foundEl.childNodes[1].getAttribute("file_name");

    if (elementInfo.isBegin) {
      statement.firstEl = attributeFileName != '' ? "\"file://" + attributeFileName + "\"" : "\"file://\"";
    } else {
      statement.secondEl = attributeFileName != '' ? "\"file://" + attributeFileName + "\"" : "\"file://\"";
    }

      break;

    case 'link': // если ссылка, то в statement идет ИНФОРМАЦИЯ второго подузла <node...<content...<![CDATA[ИНФОРМАЦИЯ]]>>>
    attributeIdtf = elementInfo.foundEl.getAttribute('idtf');

    if (elementInfo.isBegin) {
        if (attributeIdtf != '') {
            statement.firstEl = attributeIdtf;
        } else {
          statement.firstEl = temporaryNames.get(elementInfo.foundEl.getAttribute('id'));
        }
    } else {
        if (attributeIdtf != '') {
          statement.secondEl = attributeIdtf;
        } else {
          statement.secondEl = temporaryNames.get(elementInfo.foundEl.getAttribute('id'));
        }
    }

  break;

    case 'pair': //если pair, то рекурсивно вызываем

    let statementInside = {
      firstEl: null, //элемент от которого идет дуга
      pair: null, //дуга
      secondEl: null //элемент к которому идет дуга
    }

    createStatement (elementInfo.foundEl, statementInside); //заполняем вложенную тройку значениями

    if (elementInfo.isBegin) {
      statement.firstEl = statementInside;
      //statement.firstEl = "(" + statementInside.firstEl + " " + statementInside.pair + " " + 
      //    statementInside.secondEl + ")";
    } else {
      statement.secondEl = statementInside;
      //statement.secondEl = "(" + statementInside.firstEl + " " + statementInside.pair + " " + 
      //    statementInside.secondEl + ")";
    }

      break;

    case 'bus': //если bus, то ищем узел-хозяина шины по всему документу и записываем, как при обычном узле аттрибут "idtf"

    let busOwner = {
      idToFind: elementInfo.foundEl.getAttribute("owner"),  //идентификатор хозяина по которому будем искать элемент
      foundEl: null, //элемент, который найдется
    };

    findElement(xmlDoc, busOwner);

    attributeIdtf = busOwner.foundEl.getAttribute('idtf');

    if (elementInfo.isBegin) {
      if (attributeIdtf != '') {
          statement.firstEl = attributeIdtf;
      } else {
          statement.firstEl = temporaryNames.get(busOwner.foundEl.getAttribute('id'));
      }

    } else {
      if (attributeIdtf != '') {
          statement.secondEl = attributeIdtf;
      } else {
          statement.secondEl = temporaryNames.get(busOwner.foundEl.getAttribute('id'));
      }

    }
      break;

    case 'contour': //поиск всех узлов, чей parent = id контура (списком)

    let list = {
      contourChildren: []
    };

    //находим все элементы, входящие в контур и записываем в выражение LIST
    findAllChildren(xmlDoc, elementInfo.idToFind, list);

    //преобразуем список узлов в список строковых выражений
    let statList = [];
    for (let el in list.contourChildren) {
      let currentEl = list.contourChildren[el];
      let attributeIdtf = currentEl.getAttribute("idtf");

      let tempStat;
      if (attributeIdtf != '') {
          tempStat = attributeIdtf;
      } else {
          tempStat = temporaryNames.get(currentEl.getAttribute("id"));
      }

      statList.push(tempStat);
    }

    let statements = [];
    for (let el in statList) {
      //для каждого вызываем эту же функцию

      if (elementInfo.isBegin) {
        let arrayStat = {
          firstEl: statList[el], //элемент от которого идет дуга
          pair: statement.pair, //дуга
          secondEl: statement.secondEl //элемент к которому идет дуга
        }

        statements.push(getTranslated (arrayStat, isInside));

      }
    
    }

    if (elementInfo.isBegin) {

      statement.firstEl = statList;

    } else {
    
      statement.secondEl = statList;

    }
      break;
  }
}

function findAllChildren (elem, id, list) {
  for (let i in elem.childNodes) {
    if (elem.childNodes[i].nodeType === 1) {
      if (elem.childNodes[i].getAttribute("parent") == id) {
        list.contourChildren.push(elem.childNodes[i]);
      } 
    }

    findAllChildren(elem.childNodes[i], id, list);
  }
}

//функция определения типа элемента, по нему также можно понять, какие элементы обрабатываются на данный момент
function defineElementType (element) {
  if (element.foundEl.tagName === "node") {
    if (element.foundEl.childNodes[1].getAttribute("mime_type") == "image/jpg" || 
          element.foundEl.childNodes[1].getAttribute("mime_type") == "image/png") {

      element.type = "file";

    } else if (element.foundEl.childNodes[1].getAttribute("mime_type") == "content/term") {
      element.type = "link";

    } else {
      element.type = "node";

    }
    
  } else if (element.foundEl.tagName === "pair") {
    element.type = "pair";

  } else if (element.foundEl.tagName === "bus") {
    element.type = "bus";

  } else if (element.foundEl.tagName === "contour") {
    element.type = "contour";

  }
}

//функция поиска элемента по идентификатору
function findElement(elem, elementInfo) {
  for (let i in elem.childNodes) {
    if (elem.childNodes[i].nodeType === 1) {
      if (elem.childNodes[i].getAttribute("id") == elementInfo.idToFind) {
        elementInfo.foundEl = elem.childNodes[i];
      } 
    }

    findElement(elem.childNodes[i], elementInfo);
  }
}


  function getPairDictionary() {
    let replacementPairs = new Map();
      replacementPairs.set("pair/const/-/perm/noorien", "<=>")
          .set("pair/const/-/perm/orient", "=>")
          .set("pair/const/fuz/perm/orient/membership", "-/>")
          .set("pair/const/fuz/temp/orient/membership", "~/>")
          .set("pair/var/pos/perm/orient/membership", "_->")
          .set("pair/var/neg/temp/orient/membership", "_~|>")
          .set("pair/var/neg/perm/orient/membership", "_-|>")
          .set("pair/const/pos/perm/orient/membership", "->")
          .set("pair/const/pos/temp/orient/membership", "~>")
          .set("pair/var/fuz/temp/orient/membership", "_~/>")
          .set("pair/var/fuz/perm/orient/membership", "_-/>")
          .set("pair/const/neg/perm/orient/membership", "-|>") //а еще 7я это ..>
          .set("pair/const/neg/temp/orient/membership", "~|>")
          .set("pair/var/pos/temp/orient/membership", "_~>")
          .set("pair/-/-/-/noorient", "<>")
          .set("pair/-/-/-/orient", ">")//тут все дуги, кроме двух _<=> и _=> 

          //тут установим дуги, которые по сути не переводятся, но они зачем-то существуют
          .set("pair/meta/pos/temp/orient/membership", "->")
          .set("pair/meta/pos/perm/orient/membership", "->")
          .set("pair/meta/neg/temp/orient/membership", "->")
          .set("pair/meta/neg/perm/orient/membership", "->")
          .set("pair/meta/fuz/temp/orient/membership", "->")
          .set("pair/meta/fuz/perm/orient/membership", "->")
          .set("pair/meta/-/temp/orient", "->")
          .set("pair/meta/-/temp/noorien", "->")
          .set("pair/meta/-/perm/orient", "->")
          .set("pair/meta/-/perm/noorien", "->")
          .set("pair/var/-/temp/orient", "->")
          .set("pair/var/-/temp/noorien", "->")
          .set("pair/var/-/perm/orient", "->")
          .set("pair/var/-/perm/noorien", "->")
          .set("pair/const/-/temp/orient", "->")
          .set("pair/const/-/temp/noorien", "->");
      return replacementPairs;
  }

