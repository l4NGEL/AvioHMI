package avio.transport;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// no Jackson/Gson available (no Maven), so: minimal read-only JSON parser
public final class MiniJson {
    private final String src;
    private int pos;

    private MiniJson(String src) {
        this.src = src;
    }

    public static Object parse(String json) {
        MiniJson parser = new MiniJson(json);
        parser.skipWhitespace();
        return parser.parseValue();
    }

    private Object parseValue() {
        char c = peek();
        switch (c) {
            case '{': return parseObject();
            case '[': return parseArray();
            case '"': return parseString();
            case 't': expect("true"); return Boolean.TRUE;
            case 'f': expect("false"); return Boolean.FALSE;
            case 'n': expect("null"); return null;
            default: return parseNumber();
        }
    }

    private Map<String, Object> parseObject() {
        Map<String, Object> map = new LinkedHashMap<>();
        pos++; // {
        skipWhitespace();
        if (peek() == '}') { pos++; return map; }
        while (true) {
            skipWhitespace();
            String key = parseString();
            skipWhitespace();
            pos++; // :
            skipWhitespace();
            map.put(key, parseValue());
            skipWhitespace();
            char c = src.charAt(pos++);
            if (c == '}') break;
        }
        return map;
    }

    private List<Object> parseArray() {
        List<Object> list = new ArrayList<>();
        pos++; // [
        skipWhitespace();
        if (peek() == ']') { pos++; return list; }
        while (true) {
            skipWhitespace();
            list.add(parseValue());
            skipWhitespace();
            char c = src.charAt(pos++);
            if (c == ']') break;
        }
        return list;
    }

    private String parseString() {
        pos++; // opening quote
        StringBuilder sb = new StringBuilder();
        while (true) {
            char c = src.charAt(pos++);
            if (c == '"') break;
            if (c == '\\') {
                char esc = src.charAt(pos++);
                switch (esc) {
                    case '"': sb.append('"'); break;
                    case '\\': sb.append('\\'); break;
                    case '/': sb.append('/'); break;
                    case 'n': sb.append('\n'); break;
                    case 't': sb.append('\t'); break;
                    case 'r': sb.append('\r'); break;
                    case 'b': sb.append('\b'); break;
                    case 'f': sb.append('\f'); break;
                    case 'u':
                        String hex = src.substring(pos, pos + 4);
                        sb.append((char) Integer.parseInt(hex, 16));
                        pos += 4;
                        break;
                    default: sb.append(esc);
                }
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private Double parseNumber() {
        int start = pos;
        while (pos < src.length() && "+-0123456789.eE".indexOf(src.charAt(pos)) >= 0) pos++;
        return Double.parseDouble(src.substring(start, pos));
    }

    private void expect(String literal) {
        if (!src.startsWith(literal, pos)) {
            throw new IllegalStateException("Expected '" + literal + "' at position " + pos);
        }
        pos += literal.length();
    }

    private char peek() {
        return src.charAt(pos);
    }

    private void skipWhitespace() {
        while (pos < src.length() && Character.isWhitespace(src.charAt(pos))) pos++;
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> asObject(Object value) {
        return (Map<String, Object>) value;
    }

    @SuppressWarnings("unchecked")
    public static List<Object> asArray(Object value) {
        return (List<Object>) value;
    }
}
