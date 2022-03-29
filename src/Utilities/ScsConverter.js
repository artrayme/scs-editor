// var root = xmlDoc; //взятие первого узла из документа (для примера текущий документ)
// getChildren(root);      //проходим по всему DOM дереву
let pairDictionary;
let tempElement;
let flag;
let resultStat = null;
let xmlDoc;

export function convertGwfToScs(content){
    resultStat = ""
    pairDictionary = getPairDictionary()
    let parser = new DOMParser();
    xmlDoc = parser.parseFromString(content, "text/xml");
    let childNode = xmlDoc.childNodes[0];
    getChildren(childNode)
    return resultStat
}

function getChildren(elem) {
    for (const i in elem.childNodes) {
        if (elem.childNodes[i].nodeType === 1) {

            if (elem.childNodes[i].hasAttribute("type")) {
                //если дуга, то проверяем идет она в дугу или в узел
                if (elem.childNodes[i].tagName === "arc" || elem.childNodes[i].tagName === "pair") {
                    checkChildren(elem.childNodes[i], "", true);
                    getRes();
                }

            }

            getChildren(elem.childNodes[i]);
        }
    }
}

function getRes () {
    console.log(resultStat);
}

function checkChildren(elem, end, flagIsEnd) {

    isGotoNode(xmlDoc, elem.getAttribute("id_b")); //проверяем первый элемент узел или дуга

    if (flag) { //узел
        findNodeById(xmlDoc, elem.getAttribute("id_b"));
        if (resultStat == null) {
            resultStat = tempElement.getAttribute("idtf");
        } else {
            resultStat += tempElement.getAttribute("idtf");
        }
    } else { //дуга
        findNodeById(xmlDoc, elem.getAttribute("id_b"));

        if (resultStat == null) {
            resultStat = '(';
        } else {
            resultStat += '(';
        }

        end += ")";
        checkChildren(tempElement, end, false);
    }

    findNodeById(xmlDoc, elem.getAttribute("id_e"));

    isGotoNode(xmlDoc, elem.getAttribute("id_e")); //проверяем второй элемент узел или дуга
    if (flag) {
        resultStat+=pairDictionary.get(elem.getAttribute("type")) + tempElement.getAttribute("idtf") + end;
        if (flagIsEnd) {
            resultStat+= ";;\n";
        }
    } else {
        //в дугу
        resultStat+=pairDictionary.get(elem.getAttribute("type"));
        resultStat+= '(';

        end += ")";
        checkChildren(tempElement, end, true);
    }

}

//проверка на то, что дуга идет в узел. Если в узел - то запись обычной тройкой a->b, иначе a->(b->c)
function isGotoNode(elem, id) {

    for (var i in elem.childNodes) {

        if (elem.childNodes[i].nodeType === 1) {

            if (elem.childNodes[i].getAttribute("id") === id) {
                //проверяем чтобы это была дуга
                flag = elem.childNodes[i].tagName !== "pair";
            }

            isGotoNode(elem.childNodes[i], id);

        }
    }

}

function findNodeById(elem, id) {

    for (var i in elem.childNodes) {

        if (elem.childNodes[i].nodeType === 1) {

            if (elem.childNodes[i].getAttribute("id") === id) {
                tempElement = elem.childNodes[i];
            }

            findNodeById(elem.childNodes[i], id);

        }
    }

}

function getPairDictionary() {
    const replacementPairs = new Map();
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
        .set("pair/var/neg/perm/orient/membership", "-|>")
        .set("pair/var/neg/temp/orient/membership", "~|>")
        .set("pair/var/pos/temp/orient/membership", "_~>")
        .set("pair/-/-/-/noorient", "<>")
        .set("pair/-/-/-/orient", ">")
        .set("pair/const/neg/perm/orient/membership", "..>"); //тут все дуги, кроме двух _<=> и _=>
    return replacementPairs;
}

